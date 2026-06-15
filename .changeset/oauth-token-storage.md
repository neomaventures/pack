---
"@neomaventures/auth": minor
---

**BREAKING**: Persist OAuth tokens from Google code exchange on a dedicated relational table and restructure `AuthOptions.entity` into `AuthOptions.entities`.

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
  @Column({ type: "text", nullable: true }) public refreshToken!: string | null
  @Column({ type: "timestamptz" }) public expiresAt!: Date
  @Column("simple-array") public scopes!: string[]
}

AuthModule.forRoot({
  // ...
  entities: { authenticatable: User, oauthToken: OAuthToken },
  googleAuth: { /* ... */ },
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
