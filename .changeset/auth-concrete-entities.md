---
"@neomaventures/auth": minor
---

**BREAKING**: Ship concrete `Account` and `OAuthToken` entities; drop the
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
