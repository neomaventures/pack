---
"@neomaventures/auth": minor
---

Align auth surfaces on the `Authenticatable` interface so custom-entity
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
