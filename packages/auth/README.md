# @neomaventures/auth

Passwordless authentication for NestJS applications. Auth ships
`Authenticatable` and `OAuthTokenable` interfaces along with reference
`Account` and `OAuthToken` entities that implement them. Consumers either
register the reference entities for a zero-config path, or implement the
interfaces on their own entity classes to attach domain relations.

## Why Passwordless?

Password authentication requires secure hashing, strength validation,
reset flows, and breach checking. Magic links and Google OAuth eliminate
all of this complexity. The email IS the verification — simpler for
developers, fewer security footguns.

## Features

- Reference `Account` and `OAuthToken` entities exported at
  `@neomaventures/auth/entities` — register with TypeORM and you're done.
- Replaceable: implement `Authenticatable` / `OAuthTokenable` on your own
  classes and pass them via `accountEntity:` / `oauthTokenEntity:` to attach
  consumer-owned relations (e.g. `OneToMany(() => Upload) avatars`).
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

## Entity model — interfaces, reference entities, and your own

Auth defines two TypeScript contracts:

- `Authenticatable` — the identity contract auth services compile against
  (id, email, permissions, OAuth profile, OAuth tokens).
- `OAuthTokenable` — the OAuth-token contract (provider, accessToken,
  refreshToken, expiresAt, scopes, owning principal).

Two concrete reference classes implementing those interfaces ship under
the `./entities` subpath:

```typescript
import { Account, OAuthToken } from "@neomaventures/auth/entities"
```

The consumer always owns `TypeOrmModule.forFeature` registration —
auth never touches DataSource or migration files. Whether you register
the reference classes or your own is a TypeORM-scope decision.

## Getting Started — default path (zero config)

### 1. Register the reference entities with TypeORM

```typescript
import { Account, OAuthToken } from "@neomaventures/auth/entities"
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

Generate migrations against `Account` and `OAuthToken` the same way you
do for any TypeORM entity — auth does not ship migrations.

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

Omit `accountEntity:` and `oauthTokenEntity:` and the module wires services
against the reference `Account` / `OAuthToken` classes.

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

## Custom entity path — your own `Account`

When your app needs relations *from* `Account` to consumer-owned entities
(e.g. `account.avatars: Upload[]`, `account.profile: Profile`) the
reference class can't help — it lives in the auth package and can't
import your classes. Implement `Authenticatable` on your own entity
instead, register *that* with TypeORM, and pass the class to
`AuthModule.forRoot({ accountEntity })`.

```typescript
import { type Authenticatable } from "@neomaventures/auth"
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"

import { Upload } from "./upload.entity"
import { AppOAuthToken } from "./oauth-token.entity"

@Entity({ name: "account" })
export class Account implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column({ unique: true })
  public email!: string

  @Column("simple-array", { default: "" })
  public permissions!: string[]

  @CreateDateColumn()
  public createdAt!: Date

  @UpdateDateColumn()
  public updatedAt!: Date

  @OneToMany(() => AppOAuthToken, (t) => t.account, { eager: true })
  public oauthTokens?: AppOAuthToken[]

  // Consumer-owned relations the reference Account cannot carry:
  @OneToMany(() => Upload, (u) => u.account)
  public avatars?: Upload[]
}
```

Then register your class and tell `AuthModule` about it:

```typescript
import { Account } from "./account.entity"
import { AppOAuthToken } from "./oauth-token.entity"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      entities: [Account, AppOAuthToken, Upload],
    }),
    TypeOrmModule.forFeature([Account, AppOAuthToken]),
    AuthModule.forRoot({
      secret: process.env.JWT_SECRET,
      expiresIn: "1h",
      accountEntity: Account,
      oauthTokenEntity: AppOAuthToken,
      magicLink: { mailer: { /* ... */ } },
    }),
  ],
})
export class AppModule {}
```

`accountEntity:` and `oauthTokenEntity:` are independently optional. Override
either, both, or neither. The package never calls
`TypeOrmModule.forFeature` for you — you decide what's in
`entities: [...]` and your migrations are generated against that set.

### Type narrowing — how the custom class flows

`AuthModule.forRoot({ accountEntity: YourAccount })` accepts any class that
satisfies `Authenticatable`, but the concrete `YourAccount` type does
**not** flow through `forRoot` automatically. Narrowing happens at the
consumption edges:

| Surface | How `YourAccount` lands |
| --- | --- |
| `forRoot({ accountEntity: YourAccount })` | Options accept any `Authenticatable`; no narrowing past this point |
| `AuthenticationService<YourAccount>` (and `MagicLinkService<YourAccount>`, `GoogleAuthService<YourAccount, YourOAuthToken>`) | Class-level generic — annotate at constructor injection and method returns narrow |
| `getAccount<YourAccount>()` | Method-level template with `Authenticatable` default |
| `@AuthenticatedAccount() account: YourAccount` | Annotation-trusted |

```typescript
import { AuthenticationService, MagicLinkService, getAccount as _getAccount } from "@neomaventures/auth"
import { Account as YourAccount } from "./account.entity"

@Injectable()
export class ProfileService {
  public constructor(
    private readonly authentication: AuthenticationService<YourAccount>,
    private readonly magicLink: MagicLinkService<YourAccount>,
  ) {}

  public async whoAmI(token: string): Promise<YourAccount> {
    return this.authentication.authenticate(token)
  }
}

// One-line app-local wrapper if you call getAccount() outside DI:
export const getAccount = (): YourAccount | undefined => _getAccount<YourAccount>()
```

Service generics default to the reference `Account` / `OAuthToken`, so
consumers on the default path inject `AuthenticationService` without
type parameters and everything narrows to `Account`.

### 3. Enable validation

Auth exports `EmailDto` with `class-validator` decorators. For validation
to work, enable `ValidationPipe` in your application. See the
[NestJS Validation documentation](https://docs.nestjs.com/techniques/validation)
for setup instructions.

### 4. Create authentication endpoints

Use the provided services to build your authentication endpoints:

```typescript
import {
  EmailDto,
  MagicLinkService,
  SessionService,
} from "@neomaventures/auth"
import { Account } from "@neomaventures/auth/entities"
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
  ): Promise<{ token: string; account: Account; isNewAccount: boolean }> {
    const { entity, isNewAccount } = await this.magicLinkService.verify(token)
    const { token: sessionToken } = this.sessionService.create(res, entity)
    return { token: sessionToken, account: entity, isNewAccount }
  }
}
```

`SessionService.create()` issues a session JWT and sets it as an httpOnly
cookie on the response. The cookie's `Max-Age` is automatically aligned
with the JWT's expiry.

If you configured `accountEntity: YourAccount`, swap `Account` for `YourAccount`
in the return type and `@AuthenticatedAccount()` decorator signatures
below — the runtime value is whatever class you passed to `accountEntity:`.

### 5. Protect routes

Use the `@Authenticated()` decorator and `@AuthenticatedAccount()` decorator
to protect routes.

```typescript
import { Authenticated, AuthenticatedAccount } from "@neomaventures/auth"
import { Account } from "@neomaventures/auth/entities"
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

Both middlewares mirror the resolved account onto `res.locals.account`
alongside `req.account`, so view templates can read `<%= account.email %>`
directly without threading a view-model through the controller.

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

## Why two paths?

The reference entities are the battery-included path: register, configure,
ship. The interface path is the override hatch — packages can't import
consumer classes, so any consumer-side entity that wants a reverse
relation FROM `Account` (an `Upload`, a `Profile`, a `Subscription`)
needs the consumer to own the class. That's the trade in #260 / #261.

Both paths use the same services, the same decorators, the same guards.
Only the entity class identity differs.

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
token has expired. The reference `Account` ships this method; custom
entities implementing `Authenticatable` should implement it too — the
interface requires it.

```typescript
import { Authenticated, AuthenticatedAccount, OAuthTokenSnapshot } from "@neomaventures/auth"
import { Account } from "@neomaventures/auth/entities"

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
6. Google profile data is written to `account.authProfile.google`
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
  GetGoogleAuthResult,
  GoogleAuthResult,
  GoogleCallback,
  SessionService,
} from "@neomaventures/auth"
import { Account } from "@neomaventures/auth/entities"
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
  ): { token: string; account: Account; isNewAccount: boolean } {
    const { token } = this.sessionService.create(res, result.account)
    return { token, account: result.account, isNewAccount: result.isNewAccount }
  }
}
```

## API Reference

### Interfaces

#### `Authenticatable`

```ts
interface Authenticatable {
  id: string
  email: string
  permissions: string[]
  authProfile?: OAuthProfile | null
  oauthTokens?: OAuthTokenable[]
  activeToken(provider: OAuthProvider): OAuthTokenSnapshot | null
}
```

#### `OAuthTokenable`

```ts
interface OAuthTokenable {
  id: string
  provider: string
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
  scopes: string[]
}
```

### Reference Entities

Available at `@neomaventures/auth/entities`.

#### `Account`

```ts
@Entity({ name: "account" })
class Account implements Authenticatable {
  id: string                              // uuid PK
  email: string                           // unique, lowercased on write
  permissions: string[]                   // simple-array, default []
  authProfile?: OAuthProfile | null       // simple-json, nullable
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
class OAuthToken implements OAuthTokenable {
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
| `accountEntity`     | `new () => Authenticatable`         | Account entity class. Defaults to the reference `Account`.                                                                                                                                                 |
| `oauthTokenEntity`  | `new () => OAuthTokenable`          | OAuth-token entity class. Defaults to the reference `OAuthToken`.                                                                                                                                          |
| `magicLink`         | `MagicLinkOptions`                  | Magic link configuration (optional — at least one of `magicLink` or `googleAuth` is required)                                                                                                              |
| `googleAuth`        | `GoogleAuthOptions`                 | Google OAuth configuration (optional — at least one of `magicLink` or `googleAuth` is required)                                                                                                            |
| `cookie`            | `CookieOptions`                     | Session cookie configuration (optional)                                                                                                                                                                    |
| `onUnauthenticated` | `string \| HttpException class`     | Default strategy used by `@Authenticated()` when no account is found. String → 303 redirect. Class → `throw new Class(...)`. Per-route values override this. Defaults to `UnauthorizedException` (401).  |

### Decorators

| Decorator                       | Returns                       | Notes                                                                                                  |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@AuthenticatedAccount()`       | `Authenticatable \| undefined`| Use behind `@Authenticated()` to guarantee a value. Narrow to your configured entity class as needed.  |
| `@ActiveOAuthToken(provider)`   | `OAuthTokenSnapshot \| null`  | Calls `account.activeToken(provider)` under the hood.                                                  |
| `@Authenticated(options?)`      | guard                         | unchanged                                                                                              |
| `@RequiresPermission(perm)`     | guard                         | unchanged                                                                                              |
| `@RequiresAnyPermission(perms)` | guard                         | unchanged                                                                                              |
| `@GoogleCallback()`             | interceptor                   | unchanged                                                                                              |
| `@GetGoogleAuthResult()`        | `GoogleAuthResult`            | unchanged                                                                                              |

### Services

- **`MagicLinkService`**
  - `send(email): Promise<void>` — sends a magic link email
  - `verify(token): Promise<{ account: Authenticatable; isNewAccount: boolean }>`
- **`GoogleAuthService`**
  - `authorizeUrl: URL | null` — Google OAuth consent URL
  - `authenticate(code): Promise<GoogleAuthResult>`
- **`SessionService`**
  - `create(res, account): { token; payload }`
  - `clear(res): void`
- **`AuthenticationService`**
  - `authenticate(token): Promise<Authenticatable>`
- **`TokenService`**
  - `issue(payload, options?): { token; payload }`
  - `verify(token): JwtPayload`
- **`PermissionService`** — `hasPermission`, `hasAllPermissions`,
  `hasAnyPermission`, `requirePermission`, `requireAllPermissions`,
  `requireAnyPermission`. Wildcard support: `*`, `*:resource`, `action:*`.

### Events

`RegisteredEvent` and `AuthenticatedEvent` both carry
`account: Authenticatable` and `provider: AuthProvider`.

```typescript
@OnEvent(RegisteredEvent.EVENT_NAME)
public async onRegistered(event: RegisteredEvent): Promise<void> {
  await this.emailService.sendWelcome(event.account.email)
}
```

### Exceptions

| Exception                          | Status | When                                                                              |
| ---------------------------------- | ------ | --------------------------------------------------------------------------------- |
| `InvalidMagicLinkTokenException`   | 401    | Magic link token invalid or wrong audience                                        |
| `TokenFailedVerificationException` | 401    | JWT verification failed (expired, invalid signature)                              |
| `IncorrectCredentialsException`    | 401    | Account not found for valid token                                                 |
| `InvalidCredentialsException`      | 401    | Token invalid, wrong audience, or malformed header                                |
| `AuthApiException`                 | 401 / 404 / 502 | Downstream auth API returned a non-2xx, or 200 with a malformed token/ID-token payload. `error.context.provider` identifies the upstream. |
| `AuthNetworkException`             | 502    | Network failure reaching the downstream auth API (DNS, TCP, timeout). `error.context.provider` identifies the upstream. |
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
