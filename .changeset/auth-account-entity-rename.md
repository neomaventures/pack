---
"@neomaventures/auth": minor
---

Rename ambiguous "entity"/"user" naming on `AuthOptions`, result payloads, and events:

- `AuthOptions.entity` → `AuthOptions.accountEntity` (symmetric with `oauthTokenEntity`).
- `GoogleAuthResult.entity` → `GoogleAuthResult.account`; `MagicLinkVerifyResult.entity` → `MagicLinkVerifyResult.account`.
- `AuthenticatedEvent.entity` → `AuthenticatedEvent.account`; `RegisteredEvent.entity` → `RegisteredEvent.account`.
- Result flag `isNewUser` → `isNewAccount`.
- `SessionService.create(res, entity)` → `SessionService.create(res, account)`.

Consumers must rename option keys at `forRoot`/`forRootAsync` call sites and update any destructuring of `result.entity` / `event.entity` / `isNewUser`.
