# @neomaventures/auth

Passwordless authentication for NestJS applications. Auth ships concrete
`Account` and `OAuthToken` entities and provides magic-link authentication,
Google OAuth, JWT session management, cookie-based sessions, and route
protection out of the box.

## Why Passwordless?

Password authentication requires secure hashing, strength validation,
reset flows, and breach checking. Magic links and Google OAuth eliminate
all of this complexity. The email IS the verification — simpler for
developers, fewer security footguns.

## Features

- Concrete `Account` and `OAuthToken` entities — register them with
  TypeORM and you're done. No interfaces to implement, no generics to
  thread through.
- Magic link authentication (send & verify)
- Google OAuth auth code flow with account linking by verified email
- JWT session tokens with HS256 algorithm enforcement and audience
  validation
- Cookie-based sessions (httpOnly, secure, sameSite) with configurable
  options
- Dual transport: Bearer token and cookie authentication middlewares
- Route protection with guards and decorators
- Permission-based authorization with wildcard support
  (`@RequiresPermission`, `@RequiresAnyPermission`)
- Webhook signature verification (Svix-standard HMAC-SHA256)
- Email normalization (case-insensitive)
- Event emission for registration and authentication

## Installation

`@neomaventures/*` packages publish privately to GitHub Packages. Configure
`.npmrc` to resolve the `@neomaventures` scope first:

```
@neomaventures:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install:

```bash
npm install @neomaventures/auth
```

### Peer Dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express \
  @nestjs/event-emitter @nestjs/typeorm rxjs reflect-metadata \
  class-validator typeorm
```

## Getting Started

### 1. Register the entities with TypeORM

Auth ships its own `Account` and `OAuthToken` classes. Register them in
your application module alongside any other entities:

```typescript
import { Account, OAuthToken } from "@neomaventures/auth"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      // ... your database config
      entities: [Account, OAuthToken /* , YourOtherEntities */],
    }),
    TypeOrmModule.forFeature([Account, OAuthToken]),
  ],
})
export class AppModule {}
```

Generate migrations against `Account` and `OAuthToken` the same way you do
for any TypeORM entity — auth does not ship migrations.

### 2. Configure `AuthModule`

```typescript
import { AuthModule } from "@neomaventures/auth"
import { Module } from "@nestjs/common"

@Module({
  imports: [
    AuthModule.forRoot({
      secret: process.env.JWT_SECRET,
      expiresIn: "1h",
      magicLink: {
        mailer: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          from: "auth@yourapp.com",
          welcome: {
            subject: "Welcome to YourApp",
            html: '<a href="https://yourapp.com/auth/verify?token={{token}}">Sign up</a>',
          },
          welcomeBack: {
            subject: "Sign in to YourApp",
            html: '<a href="https://yourapp.com/auth/verify?token={{token}}">Sign in</a>',
          },
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
      },
      cookie: {
        name: "auth.sid", // default
        secure: true, // default
        sameSite: "lax", // default
        path: "/", // default
      },
    }),
  ],
})
export class AppModule {}
```

Use `forRootAsync` when you need to inject a config service:

```typescript
AuthModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow("JWT_SECRET"),
    expiresIn: "1h",
    magicLink: {
      mailer: {
        /* ... */
      },
    },
  }),
  inject: [ConfigService],
})
```

`AuthOptions` is not generic — `Account` is concrete, so no `<User>` type
parameter is threaded through. The `entities` slot is gone — auth owns
its schema.

#### Google OAuth

```typescript
AuthModule.forRoot({
  secret: process.env.JWT_SECRET,
  expiresIn: "1h",
  googleAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: "https://yourapp.com/auth/google/callback",
  },
  magicLink: {
    /* ... */
  },
})
```

### 3. Enable validation

Auth exports `EmailDto` with `class-validator` decorators. For validation
to work, enable `ValidationPipe` in your application. See the
[NestJS Validation documentation](https://docs.nestjs.com/techniques/validation)
for setup instructions.

### 4. Create authentication endpoints

Use the provided services to build your authentication endpoints:

```typescript
import {
  Account,
  EmailDto,
  MagicLinkService,
  SessionService,
} from "@neomaventures/auth"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from "@nestjs/common"
import { Response } from "express"

@Controller("auth")
export class AuthController {
  public constructor(
    private readonly magicLinkService: MagicLinkService,
    private readonly sessionService: SessionService,
  ) {}

  @Post("magic-link")
  @HttpCode(HttpStatus.ACCEPTED)
  public async sendMagicLink(@Body() dto: EmailDto): Promise<void> {
    await this.magicLinkService.send(dto.email)
  }

  @Get("verify")
  public async verify(
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ token: string; account: Account; isNewUser: boolean }> {
    const { entity, isNewUser } = await this.magicLinkService.verify(token)
    const { token: sessionToken } = this.sessionService.create(res, entity)
    return { token: sessionToken, account: entity, isNewUser }
  }
}
```

`SessionService.create()` issues a session JWT and sets it as an httpOnly
cookie on the response. The cookie's `Max-Age` is automatically aligned
with the JWT's expiry.

### 5. Protect routes

Use the `@Authenticated()` decorator and `@AuthenticatedAccount()` decorator to
protect routes. `@AuthenticatedAccount()` returns a concrete `Account`.

```typescript
import { Account, Authenticated, AuthenticatedAccount } from "@neomaventures/auth"
import { Controller, Get } from "@nestjs/common"

@Controller("me")
@Authenticated()
export class ProfileController {
  @Get()
  public get(@AuthenticatedAccount() account: Account): {
    id: string
    email: string
  } {
    return {
      id: account.id,
      email: account.email,
    }
  }
}
```

`AuthModule` automatically applies `BearerAuthenticationMiddleware` and
`CookieAuthenticationMiddleware` to all routes. They extract the JWT from
the `Authorization: Bearer <token>` header or the `auth.sid` cookie
respectively, and attach the authenticated account. Bearer takes priority
when both are present.

#### Choosing an unauthenticated strategy

Different route types want different responses when the caller is
anonymous. `@Authenticated()` accepts an `onUnauthenticated` option that
takes either a redirect URL or an `HttpException` class:

| Route type   | Pass                              | Result                                                                              |
| ------------ | --------------------------------- | ----------------------------------------------------------------------------------- |
| API endpoint | _(omit)_                          | `UnauthorizedException` (401)                                                       |
| Page route   | `"/auth/magic-link"`              | `UnauthorizedRedirectException` (401) with `redirect: { url, status: 303 }` in body |
| Asset route  | `NotFoundException`               | 404, indistinguishable from "no such route"                                         |

```typescript
import { Authenticated } from "@neomaventures/auth"
import { Controller, Get, NotFoundException } from "@nestjs/common"

@Controller()
export class RoutesController {
  // 401 — right for JSON API endpoints
  @Get("api/me")
  @Authenticated()
  public me(): unknown {}

  // 401 with redirect body — pair with a filter (or @neomaventures/exceptions)
  // for an actual 303
  @Get("dashboard")
  @Authenticated({ onUnauthenticated: "/auth/magic-link" })
  public dashboard(): unknown {}

  // 404 — right for asset endpoints behind a per-user session
  // (401 leaks resource existence; 303 to a login page makes <img>
  // render a broken icon)
  @Get("users/:id/avatar")
  @Authenticated({ onUnauthenticated: NotFoundException })
  public avatar(): unknown {}
}
```

Set `onUnauthenticated` on `AuthModule.forRoot()` to pick the default for
the whole app. Per-route values override the module default; the
built-in `UnauthorizedException` (401) applies when neither is set.

```typescript
AuthModule.forRoot({
  // ...other options
  onUnauthenticated: "/auth/magic-link",
})
```

## Customization via composition

`Account` is deliberately minimal. When your application needs more
fields than auth ships — a display name, an avatar, a subscription tier,
a Stripe customer id — attach them via a separate consumer-owned entity
linked to `Account` by foreign key.

```typescript
import { Account } from "@neomaventures/auth"
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm"

import { Upload } from "./upload.entity"

@Entity()
export class Profile {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @OneToOne(() => Account)
  @JoinColumn()
  public account!: Account

  @Column({ type: "varchar", nullable: true })
  public displayName!: string | null

  @OneToOne(() => Upload, { eager: true, nullable: true })
  @JoinColumn()
  public avatar?: Upload | null
}
```

Look up the profile by `accountId` in your controller — the account
slot gives you the account directly:

```typescript
@Get("profile")
@Authenticated()
public async profile(
  @AuthenticatedAccount() account: Account,
): Promise<Profile | null> {
  return this.profiles.findOne({
    where: { account: { id: account.id } },
  })
}
```

The SaaS template under `templates/saas/` carries a working `Profile`
example.

**Single-table inheritance / `@ChildEntity`** is explicitly unsupported.
The FK relation between `OAuthToken.account` and `Account` is final;
extending `Account` breaks the type contract on the FK side.

## OAuth tokens

`GoogleAuthService.authenticate()` captures the full token response from
Google — `access_token`, `refresh_token`, `expires_in`, `scope` — and
upserts a row in the `oauth_token` table. The unique index on
`(account, provider)` enforces one row per pair; subsequent logins
overwrite that row in place rather than appending.

The upsert and the account write run inside a single
`DataSource.transaction()`, so the account row and the token row stay
consistent — either both commit or both roll back. Events emit only
after the transaction returns successfully.

On subsequent logins where Google omits `refresh_token` (which it does
after the first consent), the existing refresh token is preserved.

### Reading the active token

`Account.activeToken(provider)` returns a snapshot of the active token
for the requested provider, or `null` when none exists or the stored
token has expired:

```typescript
import { Account, OAuthTokenSnapshot } from "@neomaventures/auth"

@Get("inbox/count")
@Authenticated()
public count(@AuthenticatedAccount() account: Account): { count: number } {
  const token = account.activeToken("google")
  if (!token) return { count: 0 }
  return this.gmail.count(token.accessToken)
}
```

The snapshot includes `accessToken`, `expiresAt`, and `scopes`. It
deliberately omits `refreshToken` — refresh is an internal concern of
the auth package. When the stored `expiresAt` is in the past,
`activeToken()` returns `null`; automatic refresh-on-expiry is not yet
implemented.

### The `@ActiveOAuthToken` decorator

For controller-handler ergonomics, `@ActiveOAuthToken(provider)` returns
the same snapshot directly as a parameter:

```typescript
import {
  ActiveOAuthToken,
  Authenticated,
  OAuthTokenSnapshot,
} from "@neomaventures/auth"

@Controller("inbox")
@Authenticated()
export class InboxController {
  @Get("count")
  public count(
    @ActiveOAuthToken("google") token: OAuthTokenSnapshot | null,
  ): { count: number } {
    if (!token) return { count: 0 }
    return { count: callGmailWith(token.accessToken) }
  }
}
```

`@ActiveOAuthToken` exists to avoid the name collision with the
`OAuthToken` entity class — importing both would otherwise force an
alias.

## Magic Link Flow

1. User submits email -> `POST /auth/magic-link`
2. Server generates JWT with `aud: "magic-link"` and emails verification
   link
3. User clicks link -> `GET /auth/verify?token=...`
4. Server validates token, creates account (if new) or finds existing
5. Server issues session JWT with `aud: "session"` and sets httpOnly
   cookie
6. Subsequent requests authenticate via cookie or
   `Authorization: Bearer <token>` header

## Google OAuth Flow

1. Your frontend redirects the user to Google's OAuth consent screen
2. Google redirects back to your callback URL with a `code` query
   parameter
3. The `@GoogleCallback()` interceptor exchanges the code with Google's
   token endpoint server-to-server
4. The ID token is decoded to extract the user's email, name, and picture
5. The email is used to find an existing account or create a new one
   (same find-or-create-by-email pattern as magic links)
6. Google profile data is written to `Account.authProfile.google`
7. Your controller receives the result via `@GetGoogleAuthResult()` and
   issues a session

### Account Linking

Account linking happens automatically by verified email. If a user signs
up via magic link with `alice@example.com` and later signs in with
Google using the same email, they get the same account. This works
because both flows verify email ownership — magic links by definition,
and Google OAuth by checking the `email_verified` claim in the ID token.

### Google OAuth Controller Example

```typescript
import {
  Account,
  GetGoogleAuthResult,
  GoogleAuthResult,
  GoogleCallback,
  SessionService,
} from "@neomaventures/auth"
import { Controller, Get, Res } from "@nestjs/common"
import { Response } from "express"

@Controller("auth/google")
export class GoogleAuthController {
  public constructor(private readonly sessionService: SessionService) {}

  @Get("callback")
  @GoogleCallback()
  public handleCallback(
    @GetGoogleAuthResult() result: GoogleAuthResult,
    @Res({ passthrough: true }) res: Response,
  ): { token: string; account: Account; isNewUser: boolean } {
    const { token } = this.sessionService.create(res, result.entity)
    return { token, account: result.entity, isNewUser: result.isNewUser }
  }
}
```

## API Reference

### Entities

#### `Account`

```ts
@Entity({ name: "account" })
class Account {
  id: string                              // uuid PK
  email: string                           // unique, lowercased on write
  permissions: string[]                   // simple-array, default []
  authProfile?: OAuthProfile    // simple-json, nullable
  createdAt: Date
  updatedAt: Date
  oauthTokens?: OAuthToken[]              // @OneToMany, eager

  activeToken(provider: OAuthProvider): OAuthTokenSnapshot | null
}
```

#### `OAuthToken`

```ts
@Entity({ name: "oauth_token" })
@Index(["account", "provider"], { unique: true })
class OAuthToken {
  id: string
  account: Relation<Account>              // @ManyToOne, FK `accountId`
  provider: string
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
  scopes: string[]                        // simple-array
}
```

### Configuration

| Option              | Type                                | Description                                                                                                                                                                                                |
| ------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `secret`            | `string`                            | JWT signing secret                                                                                                                                                                                         |
| `expiresIn`         | `string \| number`                  | Session token expiration (e.g., "1h", "7d")                                                                                                                                                                |
| `magicLink`         | `MagicLinkOptions`                  | Magic link configuration (optional — at least one of `magicLink` or `googleAuth` is required)                                                                                                              |
| `googleAuth`        | `GoogleAuthOptions`                 | Google OAuth configuration (optional — at least one of `magicLink` or `googleAuth` is required)                                                                                                            |
| `cookie`            | `CookieOptions`                     | Session cookie configuration (optional)                                                                                                                                                                    |
| `webhook`           | `WebhookOptions`                    | Webhook signature verification configuration (optional)                                                                                                                                                    |
| `onUnauthenticated` | `string \| HttpException class`     | Default strategy used by `@Authenticated()` when no account is found. String → 303 redirect. Class → `throw new Class(...)`. Per-route values override this. Defaults to `UnauthorizedException` (401).  |

### Decorators

| Decorator                       | Returns                       | Notes                                                                                                  |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@AuthenticatedAccount()`                  | `Account \| undefined`        | Concrete type. Use behind `@Authenticated()` to guarantee a value.                                     |
| `@ActiveOAuthToken(provider)`   | `OAuthTokenSnapshot \| null`  | Calls `account.activeToken(provider)` under the hood. Renamed from `@OAuthToken` to avoid the entity name collision. |
| `@Authenticated(options?)`      | guard                         | unchanged                                                                                              |
| `@RequiresPermission(perm)`     | guard                         | unchanged                                                                                              |
| `@RequiresAnyPermission(perms)` | guard                         | unchanged                                                                                              |
| `@GoogleCallback()`             | interceptor                   | unchanged                                                                                              |
| `@GetGoogleAuthResult()`        | `GoogleAuthResult`            | concrete                                                                                               |

### Services

- **`MagicLinkService`**
  - `send(email): Promise<void>` — sends a magic link email
  - `verify(token): Promise<{ entity: Account; isNewUser: boolean }>`
- **`GoogleAuthService`**
  - `authorizeUrl: URL | null` — Google OAuth consent URL
  - `authenticate(code): Promise<GoogleAuthResult>`
- **`SessionService`**
  - `create(res, account): { token; payload }`
  - `clear(res): void`
- **`AuthenticationService`**
  - `authenticate(token): Promise<Account>`
- **`TokenService`**
  - `issue(payload, options?): { token; payload }`
  - `verify(token): JwtPayload`
- **`PermissionService`** — `hasPermission`, `hasAllPermissions`,
  `hasAnyPermission`, `requirePermission`, `requireAllPermissions`,
  `requireAnyPermission`. Wildcard support: `*`, `*:resource`, `action:*`.

### Events

`RegisteredEvent` and `AuthenticatedEvent` both carry `entity: Account`
and `provider: AuthProvider`. No generics.

```typescript
@OnEvent(RegisteredEvent.EVENT_NAME)
public async onRegistered(event: RegisteredEvent): Promise<void> {
  await this.emailService.sendWelcome(event.entity.email)
}
```

### Exceptions

| Exception                          | Status | When                                                                              |
| ---------------------------------- | ------ | --------------------------------------------------------------------------------- |
| `InvalidMagicLinkTokenException`   | 401    | Magic link token invalid or wrong audience                                        |
| `TokenFailedVerificationException` | 401    | JWT verification failed (expired, invalid signature)                              |
| `IncorrectCredentialsException`    | 401    | Account not found for valid token                                                 |
| `InvalidCredentialsException`      | 401    | Token invalid, wrong audience, or malformed header                                |
| `GoogleCodeExchangeException`      | 401    | Google rejected the authorization code (4xx)                                      |
| `GoogleTokenException`             | 401    | ID token missing required claims                                                  |
| `GoogleServiceException`           | 502    | Google returned 5xx                                                               |
| `GoogleNetworkException`           | 502    | Network failure reaching Google                                                   |
| `EmailNotVerifiedException`        | 403    | Google account email not verified                                                 |
| `UnauthorizedRedirectException`    | 401    | Unauthenticated route with redirect strategy. Body includes `redirect: { url, status }` |
| `PermissionDeniedException`        | 403    | User lacks required permission(s)                                                 |

## Security

- JWTs signed and verified with HS256 only — other algorithms rejected
- Magic link tokens use `aud: "magic-link"`, session tokens use
  `aud: "session"` — cross-use is prevented
- Session cookies are httpOnly, secure, SameSite=Lax by default
- Cookie `Max-Age` aligned with JWT expiry
- Error responses use generic messages — details logged server-side
- Email lookups case-insensitive (lowercased on write)
- Magic links expire after 15 minutes
- Google ID tokens decoded but not signature-verified, because they are
  received directly from Google's token endpoint over TLS in a
  server-to-server exchange
- Google accounts with unverified emails are rejected
  (`EmailNotVerifiedException`)

## License

MIT
