import { faker } from "@faker-js/faker"
import { express } from "@neomaventures/fixtures"
import { type DynamicModule } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import * as cookie from "cookie"
import { type Response } from "express"
import * as jwt from "jsonwebtoken"
import { v4 } from "uuid"

import { AuthModule } from "../auth.module"
import { type AuthOptions, type MailerOptions } from "../auth.options"
import { Account } from "../entities/account.entity"
import { OAuthToken } from "../entities/oauth-token.entity"

import { SESSION_AUDIENCE } from "./magic-link.service"
import { SessionService } from "./session.service"

const buildAccount = (): Account => {
  const account = new Account()
  account.id = v4()
  account.email = faker.internet.email()
  return account
}

const registrations: [string, (opts: AuthOptions) => DynamicModule][] = [
  ["forRoot", (opts): DynamicModule => AuthModule.forRoot(opts)],
  [
    "forRootAsync",
    (opts): DynamicModule =>
      AuthModule.forRootAsync({ useFactory: (): AuthOptions => opts }),
  ],
]

registrations.forEach(([name, register]) => {
  describe(`SessionService (${name})`, () => {
    const secret = faker.string.alphanumeric(32)
    const expiresIn = "1h"

    const buildModule = async (cookieOptions?: {
      name?: string
      domain?: string
      secure?: boolean
      sameSite?: "strict" | "lax" | "none"
      path?: string
    }): Promise<SessionService> => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "sqlite",
            database: ":memory:",
            entities: [Account, OAuthToken],
            synchronize: true,
          }),
          register({
            secret,
            expiresIn,
            magicLink: { mailer: {} as MailerOptions },
            cookie: cookieOptions,
          }),
        ],
      }).compile()

      return module.get<SessionService>(SessionService)
    }

    describe("create", () => {
      let service: SessionService
      let entity: Account

      beforeEach(async () => {
        service = await buildModule()
        entity = buildAccount()
      })

      it("should issue a token with sub and session audience", () => {
        const res = express.response() as unknown as Response
        const result = service.create(res, entity)

        const payload = jwt.verify(result.token, secret) as jwt.JwtPayload
        expect(payload.sub).toBe(entity.id)
        expect(payload.aud).toBe(SESSION_AUDIENCE)
      })

      it("should return the token and decoded payload", () => {
        const res = express.response() as unknown as Response
        const result = service.create(res, entity)

        expect(result.token).toBeDefined()
        expect(result.payload).toBeDefined()
        expect(result.payload.sub).toBe(entity.id)
        expect(result.payload.aud).toBe(SESSION_AUDIENCE)
      })

      it("should set a Set-Cookie header with auth.sid by default", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity)

        const parsed = cookie.parse(res.get("set-cookie")!)
        expect(parsed["auth.sid"]).toBeDefined()
      })

      it("should append to existing Set-Cookie headers rather than overwrite", () => {
        const res = express.response() as unknown as Response
        res.setHeader("Set-Cookie", "existing=value")
        service.create(res, entity)

        const header = res.getHeader("set-cookie") as string[]
        expect(header).toHaveLength(2)
        expect(header[0]).toBe("existing=value")
        expect(header[1]).toContain("auth.sid=")
      })

      it("should set httpOnly=true", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity)

        expect(res.get("set-cookie")!.toLowerCase()).toContain("httponly")
      })

      it("should set Secure by default", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity)

        expect(res.get("set-cookie")!.toLowerCase()).toContain("secure")
      })

      it("should set SameSite=Lax by default", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity)

        expect(res.get("set-cookie")!.toLowerCase()).toContain("samesite=lax")
      })

      it("should set Path=/ by default", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity)

        expect(res.get("set-cookie")!).toContain("Path=/")
      })

      it("should set Max-Age matching the JWT expiry", () => {
        const res = express.response() as unknown as Response
        service.create(res, entity)

        // expiresIn is "1h" = 3600 seconds
        expect(res.get("set-cookie")!).toContain("Max-Age=3600")
      })

      describe("with custom cookie options", () => {
        beforeEach(async () => {
          service = await buildModule({
            name: "my-app.sid",
            domain: "example.com",
            secure: false,
            sameSite: "strict",
            path: "/api",
          })
        })

        it("should use the custom cookie name", () => {
          const res = express.response() as unknown as Response
          service.create(res, entity)

          const parsed = cookie.parse(res.get("set-cookie")!)
          expect(parsed["my-app.sid"]).toBeDefined()
          expect(parsed["auth.sid"]).toBeUndefined()
        })

        it("should use the custom domain", () => {
          const res = express.response() as unknown as Response
          service.create(res, entity)

          expect(res.get("set-cookie")!).toContain("Domain=example.com")
        })

        it("should use custom SameSite", () => {
          const res = express.response() as unknown as Response
          service.create(res, entity)

          expect(res.get("set-cookie")!.toLowerCase()).toContain(
            "samesite=strict",
          )
        })

        it("should use custom path", () => {
          const res = express.response() as unknown as Response
          service.create(res, entity)

          expect(res.get("set-cookie")!).toContain("Path=/api")
        })

        it("should not include Secure when secure=false", () => {
          const res = express.response() as unknown as Response
          service.create(res, entity)

          expect(res.get("set-cookie")!.toLowerCase()).not.toContain("secure")
        })
      })
    })

    describe("cookie configuration validation", () => {
      it("should throw when sameSite=none and secure=false", async () => {
        await expect(
          buildModule({ sameSite: "none", secure: false }),
        ).rejects.toThrow(
          'Auth cookie misconfiguration: sameSite="none" requires secure=true',
        )
      })

      it("should allow sameSite=none when secure=true", async () => {
        const service = await buildModule({ sameSite: "none", secure: true })
        expect(service).toBeDefined()
      })
    })

    describe("clear", () => {
      let service: SessionService

      beforeEach(async () => {
        service = await buildModule()
      })

      it("should set a cookie with Max-Age=0", () => {
        const res = express.response() as unknown as Response
        service.clear(res)

        expect(res.get("set-cookie")!).toContain("Max-Age=0")
      })

      it("should set the cookie name to auth.sid", () => {
        const res = express.response() as unknown as Response
        service.clear(res)

        const parsed = cookie.parse(res.get("set-cookie")!)
        expect(parsed["auth.sid"]).toBeDefined()
      })
    })
  })
})
