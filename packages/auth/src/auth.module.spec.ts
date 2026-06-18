import { faker } from "@faker-js/faker"
import { Test } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"

import { AuthModule } from "./auth.module"
import { type AuthOptions, RESOLVED_AUTH_OPTIONS } from "./auth.options"
import { Account } from "./entities/account.entity"
import { OAuthToken } from "./entities/oauth-token.entity"
import { type Authenticatable } from "./interfaces/authenticatable.interface"
import { type OAuthTokenable } from "./interfaces/oauth-tokenable.interface"
import { type OAuthProfile } from "./types/oauth-profile.type"

const options: AuthOptions = {
  secret: faker.string.alphanumeric(32),
  expiresIn: "1h",
  magicLink: {
    mailer: {
      host: faker.internet.domainName(),
      port: faker.internet.port(),
      from: faker.internet.email(),
      welcome: {
        subject: faker.lorem.sentence(),
        html: `<a href="{{token}}">${faker.lorem.words(2)}</a>`,
      },
      welcomeBack: {
        subject: faker.lorem.sentence(),
        html: `<a href="{{token}}">${faker.lorem.words(2)}</a>`,
      },
    },
  },
}

describe("AuthModule", () => {
  describe("Given no entity overrides", () => {
    it("should default entity to Account and oauthTokenEntity to OAuthToken", async () => {
      const module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "sqlite",
            database: ":memory:",
            entities: [Account, OAuthToken],
            synchronize: true,
          }),
          TypeOrmModule.forFeature([Account, OAuthToken]),
          AuthModule.forRootAsync({
            useFactory: () => options,
          }),
        ],
      }).compile()

      const resolved = module.get(RESOLVED_AUTH_OPTIONS)
      expect(resolved).toMatchObject({
        ...options,
        accountEntity: Account,
        oauthTokenEntity: OAuthToken,
      })
    })
  })

  describe("Given custom entity overrides", () => {
    class CustomAccount implements Authenticatable {
      public id!: string
      public email!: string
      public permissions?: string[]
      public authProfile?: OAuthProfile | null
    }

    class CustomOAuthToken implements OAuthTokenable {
      public id!: string
      public account!: Authenticatable
      public provider!: string
      public accessToken!: string
      public refreshToken!: string | null
      public expiresAt!: Date
      public scopes!: string[]
    }

    it("should use the provided entity and oauthTokenEntity", async () => {
      const module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "sqlite",
            database: ":memory:",
            entities: [Account, OAuthToken],
            synchronize: true,
          }),
          TypeOrmModule.forFeature([Account, OAuthToken]),
          AuthModule.forRootAsync({
            useFactory: () => ({
              ...options,
              accountEntity: CustomAccount,
              oauthTokenEntity: CustomOAuthToken,
            }),
          }),
        ],
      }).compile()

      const resolved = module.get(RESOLVED_AUTH_OPTIONS)
      expect(resolved).toMatchObject({
        accountEntity: CustomAccount,
        oauthTokenEntity: CustomOAuthToken,
      })
    })
  })
})
