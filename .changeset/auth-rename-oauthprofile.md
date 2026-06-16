---
"@neomaventures/auth": minor
---

**BREAKING**: Rename `AuthenticatableProfile` → `OAuthProfile`. The type describes provider-supplied profile data from an OAuth callback (stored on `Account.authProfile`), so the new name reflects what it actually represents. File renamed `types/auth-profile.type.ts` → `types/oauth-profile.type.ts`.
