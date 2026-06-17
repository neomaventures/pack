# Changelog

## 0.7.0

### Minor Changes

- 6eda0de: Align auth surfaces on the `Authenticatable` interface so custom-entity
  consumers get the same ergonomics as the reference `Account`:
  - `OAuthTokenService.getActiveToken(account, provider)` is a static
    namespace method exported from the package root. Consumers with a
    custom entity call it directly without reimplementing the lookup
    logic. `Account.activeToken` becomes a thin wrapper that delegates to
    the same static method. `OAuthTokenService` is a namespace-style class
    — never injected, never registered as a provider.
  - `PermissionService` methods (`hasPermission`, `requirePermission`,
    etc.) now accept `Authenticatable` instead of the concrete `Account`.
    The `permissions?: string[]` field is already on the interface, so no
    behavioural change.
  - `AuthenticatedEvent` and `RegisteredEvent` become generic over
    `T extends Authenticatable = Account`. Listeners can narrow the
    `entity` field to a custom entity at the call site:
    `@OnEvent(AuthenticatedEvent.EVENT_NAME)
handle(event: AuthenticatedEvent<CustomAccount>): void`.

  No behavioural change for default consumers; the reference `Account`
  remains the zero-config experience.

- 9f13aed: **BREAKING**: Ship concrete `Account` and `OAuthToken` entities; drop the
  `Authenticatable` / `OAuthAuthenticatable` / `OAuthTokenable` interfaces
  and the `AuthOptions.entities` config slot.

  Auth now owns its identity schema end-to-end. Consumers register the
  entities directly with TypeORM and configure `AuthModule` without an
  `entities` option. Custom fields move off `Account` into FK-linked
  consumer entities (e.g. a `Profile` with `@OneToOne(() => Account)`),
  not via interface implementation.

  Migration:
  1. Delete your local `Account` / `OAuthToken` entities — import them
     from `@neomaventures/auth` instead.
  2. Register the imported classes: `TypeOrmModule.forFeature([Account, OAuthToken])`.
  3. Drop the `entities` option from `AuthModule.forRoot(...)`.
  4. Move custom fields off `Account` into a separate FK-linked entity.
  5. Replace `OAuthTokenService.getActiveToken(provider)` with
     `account.activeToken(provider)`.
  6. Replace `@OAuthToken("google")` with `@ActiveOAuthToken("google")`.
  7. The FK column on `oauth_token` is now `accountId` (was `principalId`)
     — generate a rename migration.

- 9f13aed: **BREAKING**: Rename `AuthenticatableProfile` → `OAuthProfile`. The type describes provider-supplied profile data from an OAuth callback (stored on `Account.authProfile`), so the new name reflects what it actually represents. File renamed `types/auth-profile.type.ts` → `types/oauth-profile.type.ts`.
- 9f13aed: **BREAKING**: Rename `Principal` to `Account` throughout the public API. `getPrincipal()` is now `getAccount()`, `@Principal()` is now `@AuthenticatedAccount()` (pairs naturally with the `@Authenticated()` guard), `CurrentPrincipal` injection token is now `CurrentAccountToken`, and `Request.principal` is now `Request.account`. The "principal" abstraction was a holdover from when auth had a generic identity interface; now that `Account` is the concrete entity, all references use account naming.
- 6eda0de: Add optional `entity` / `oauthTokenEntity` slots to `AuthOptions` so
  consumers can replace the shipped `Account` / `OAuthToken` entities with
  their own classes (and hang TypeORM relations off them). Re-introduces the
  `Authenticatable` interface (with an optional `oauthTokens?: OAuthTokenable[]`
  field) and the `OAuthTokenable` interface, and ships them via the new
  `@neomaventures/auth/entities` subpath export.
  Class-level generics on `AuthenticationService<T>`, `MagicLinkService<T>`,
  and `GoogleAuthService<T, U>` propagate the chosen entity type through
  return values; `getAccount` / `setAccount` slot wrappers take a
  method-level template defaulted to `Authenticatable`.

  Net-additive: existing `AuthModule.forRoot({...})` callsites work unchanged
  because both options default to the reference `Account` / `OAuthToken`
  entities. Root re-exports are preserved.

  Custom-entity usage:

  ```typescript
  import { Authenticatable, AuthModule } from "@neomaventures/auth"

  @Entity()
  export class User implements Authenticatable {
    @PrimaryGeneratedColumn("uuid") public id!: string
    @Column({ unique: true }) public email!: string

    @OneToMany(() => Avatar, (a) => a.user)
    public avatars!: Avatar[]
  }

  AuthModule.forRoot({
    secret: process.env.JWT_SECRET,
    expiresIn: "1h",
    entity: User,
    magicLink: {
      /* ... */
    },
  })
  ```

  Type narrowing is asymmetric across the surface:
  - `forRoot({ entity: CustomAccount })` — options accept any
    `Authenticatable`; no narrowing past this point.
  - `AccountService<CustomAccount>` (injection) — consumer annotates; the
    class-level generic enforces method return types.
  - `getAccount<CustomAccount>()` / consumer wrapper — method-level template
    with `Authenticatable` default.
  - `@AuthenticatedAccount() account: CustomAccount` — annotation-trusted.

  No migration needed.

- 9f13aed: Ship `@neomaventures/auth/testing` subpath export with `fakeAccount()` and `fakeOAuthToken()` builders. Consumers can now seed real `Account` instances (with `activeToken()` etc.) and `OAuthToken` instances in tests without rolling their own factories. `@faker-js/faker` and `@neomaventures/google-fixtures` are optional peer dependencies — only required when importing from `/testing`.

## 0.6.1

## 0.6.0

### Minor Changes

- bf2f260: **BREAKING**: Persist OAuth tokens from Google code exchange on a dedicated relational table and restructure `AuthOptions.entity` into `AuthOptions.entities`.

  `AuthOptions.entity: User` is replaced by `AuthOptions.entities: { authenticatable: User, oauthToken?: OAuthToken }`. The `entities.oauthToken` slot is required at the type level whenever `googleAuth` is configured, so consumers cannot wire Google sign-in without also providing the entity that backs the token store.

  `GoogleAuthService.authenticate()` now captures `access_token`, `refresh_token`, `expires_in`, and `scope` from Google's token response and upserts a row on the consumer-supplied OAuth-token entity. The upsert and the principal write run inside a single `DataSource.transaction()` — either both commit or both roll back, and `RegisteredEvent` / `AuthenticatedEvent` fire only after the transaction returns successfully.

  Tokens are modelled relationally rather than as an in-row JSON column. Consumer entities use a `@ManyToOne` navigation on the OAuth-token side and a matching eager `@OneToMany` on the principal side; TypeORM derives the `principalId` FK column automatically. A unique constraint on `(principal, provider)` enforces the one-row-per-provider invariant.

  ```typescript
  @Entity()
  export class User implements OAuthAuthenticatable {
    @PrimaryGeneratedColumn("uuid") public id!: string
    @Column({ unique: true }) public email!: string
    @OneToMany(() => OAuthToken, (t) => t.principal, { eager: true })
    public oauthTokens?: OAuthToken[]
  }

  @Entity()
  @Unique(["principal", "provider"])
  export class OAuthToken implements OAuthTokenable {
    @PrimaryGeneratedColumn("uuid") public id!: string
    @ManyToOne(() => User) public principal!: User
    @Column() public provider!: string
    @Column() public accessToken!: string
    @Column({ type: "text", nullable: true }) public refreshToken!:
      | string
      | null
    @Column({ type: "timestamptz" }) public expiresAt!: Date
    @Column("simple-array") public scopes!: string[]
  }

  AuthModule.forRoot({
    // ...
    entities: { authenticatable: User, oauthToken: OAuthToken },
    googleAuth: {
      /* ... */
    },
  })
  ```

  A new `OAuthTokenService` and matching `@OAuthToken(provider)` parameter decorator expose the active token for the current principal:

  ```ts
  @Get("inbox/count")
  @Authenticated()
  public count(@OAuthToken("google") token: OAuthTokenSnapshot | null): unknown {
    if (!token) return { count: 0 }
    return this.gmail.getCount(token.accessToken)
  }
  ```

  The snapshot omits `refreshToken` — that's internal to the package's future refresh logic (#171). When the stored `expiresAt` is in the past, both the service and decorator return `null`.

  `OAuthTokenService` is exposed as a static-method namespace with no DI dependencies — call `OAuthTokenService.getActiveToken(provider)` or `OAuthTokenService.getActiveTokenFor(principal, provider)` directly. It is not registered as a provider and should not be injected.

  The refresh-token preservation is intentional: Google only returns `refresh_token` on first consent / re-consent, so on subsequent logins the upsert preserves the existing refresh token rather than nulling it.

  Consumers using Google OAuth should create an `oauth_token` table via their own migration (the auth package does not ship migrations).

  ### Migrating from `entity`

  Update every `AuthModule.forRoot` / `forRootAsync` callsite and every `AuthOptions` value:

  ```diff
   AuthModule.forRoot({
     secret: process.env.JWT_SECRET,
     expiresIn: "1h",
  -  entity: User,
  +  entities: { authenticatable: User },
     magicLink: { /* ... */ },
   })
  ```

  When `googleAuth` is configured, supply `oauthToken` as well and create the corresponding entity class.

## 0.5.0

### Minor Changes

- e0a9784: Unified `@Authenticated()` strategy: per-route `onUnauthenticated` + `AuthModule.forRoot({ onUnauthenticated: ... })` default with class-decorator factory.

  BREAKING: `Authenticated` is now a decorator factory, not a guard class. Migration: `@UseGuards(new Authenticated("/x"))` → `@Authenticated({ onUnauthenticated: "/x" })`. `@UseGuards(new Authenticated())` → `@Authenticated()`.

  `UnauthorizedRedirectException` now includes the redirect target in its response body (`{ statusCode, message, redirect: { url, status } }`) so consumers can observe the intended redirect without a redirect-aware exception filter. Consumers using `@neomaventures/exceptions` are unaffected — the 303 redirect still triggers via `getRedirect()`.

  `AuthenticatedGuard` now builds a resource-aware message in the form `Unauthenticated, access to resource <request-url> denied` and passes it into every exception it throws (`UnauthorizedException`, `UnauthorizedRedirectException`, and any class strategy), so server logs and the response body carry context about which resource was denied. The previous default `UnauthorizedException` text ("Unable to authenticate a principal...") is replaced by this resource-aware message.

  BREAKING: `RequiresPermissionGuard` is no longer a public export. The decorator-only pattern is now uniform across the package — use `@RequiresPermission()` / `@RequiresAnyPermission()` instead. Tests that previously bypassed the guard by overriding it should mock via the principal slot instead.

## 0.4.0

### Minor Changes

- c57fbdf: Add `authorizeUrl` getter to `GoogleAuthService` and optional `scopes` config to `GoogleAuthOptions`.

  `GoogleAuthService.authorizeUrl` returns a `URL` built from the configured client ID, redirect URI, and scopes — or `null` when Google OAuth is not configured. Scopes default to `["openid", "email", "profile"]` and can be overridden via the new `GoogleAuthOptions.scopes` array.

## 0.3.1

### Patch Changes

- cfeb742: Migrate Google OAuth test fixtures to `@neomaventures/google-fixtures`. No API changes — internal test refactor only.

## 0.3.0

### Minor Changes

- b01c502: **Breaking:** Remove `WebhookSignatureGuard` and `WebhookOptions` from `@neomaventures/auth`. Webhook signature verification has moved to `@neomaventures/webhooks`.

  Migration: replace `webhook: { secret }` on `AuthModule.forRoot()` with a separate `WebhooksModule.forRoot({ secret })` import from `@neomaventures/webhooks`, and update guard imports to `import { WebhookSignatureGuard } from "@neomaventures/webhooks"`.

## 0.2.0

### Minor Changes

- a9c9bee: Register principal slot via `@neomaventures/request-context`'s `createContextSlot` kit. Adds `getPrincipal()` accessor, `CurrentPrincipal` injection token, and reimplements `@Principal()` decorator on the ALS-backed slot. Auth middlewares dual-write to both `req.principal` and the slot. Guards read from `getPrincipal()`. `req.principal` is deprecated but continues to work. `@Principal()` now returns `undefined` instead of throwing when no principal exists. `@neomaventures/request-context` is now a peer dependency.

## 0.1.1

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
