---
"@neomaventures/auth": minor
---

Add optional `entity` / `oauthTokenEntity` slots to `AuthOptions` so
consumers can replace the shipped `Account` / `OAuthToken` entities with
their own classes (and hang TypeORM relations off them). Re-introduces the
`Authenticatable`, `OAuthAuthenticatable`, and `OAuthTokenable` interfaces
and ships them via the new `@neomaventures/auth/entities` subpath export.
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
  magicLink: { /* ... */ },
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
