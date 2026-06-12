import { SESSION_AUDIENCE } from "@neomaventures/auth"
import { type INestApplication } from "@nestjs/common"
import * as cookie from "cookie"
import jwt from "jsonwebtoken"
import { DataSource } from "typeorm"

import { Account } from "~auth/account.entity"

/**
 * Mints a session cookie for the given email and returns the `Cookie`
 * header value, ready to be sent with a subsequent supertest request.
 *
 * Skips the magic-link round-trip — the account is inserted directly via
 * the running app's TypeORM `DataSource`, then a session JWT is signed
 * externally using the same secret + claim shape the auth package uses.
 * No test-only code lives in the app: production entities (`Account`)
 * and constants (`SESSION_AUDIENCE`) are consumed from the fixture
 * process, but nothing test-only is injected into the app's module graph.
 *
 * The fixture knows the auth package's contract (cookie name, claim
 * shape, JWT secret env var). If that contract changes, this fixture
 * needs to follow — accepted cost for keeping the app's `src/` clean.
 *
 * @param app - The managed NestJS application instance under test.
 * @param email - The email address to authenticate as. Lower-cased
 *   internally to match the normalisation `MagicLinkService.verify`
 *   applies.
 * @returns The serialised `Cookie` header value (`auth.sid=...`).
 *
 * @example
 * ```typescript
 * const email = faker.internet.email()
 * const cookie = await authenticate(app, email)
 * await request(app.getHttpServer())
 *   .get("/profile")
 *   .set("Cookie", cookie)
 *   .expect(HttpStatus.OK)
 * ```
 */
export const authenticate = async (
  app: INestApplication,
  email: string,
): Promise<string> => {
  const accounts = app.get(DataSource).getRepository(Account)
  const normalised = email.toLowerCase()

  const account =
    (await accounts.findOneBy({ email: normalised })) ??
    (await accounts.save(
      accounts.create({ email: normalised, permissions: [] }),
    ))

  const token = jwt.sign(
    { sub: account.id, aud: SESSION_AUDIENCE },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" },
  )

  return cookie.serialize("auth.sid", token, {
    httpOnly: true,
    secure: process.env.APP_URL?.startsWith("https") ?? false,
    sameSite: "lax",
    path: "/",
  })
}
