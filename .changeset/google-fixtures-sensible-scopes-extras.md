---
"@neomaventures/google-fixtures": minor
---

`google.sensibleScopes()` now accepts additional scopes to append.

Callers that want the sensible defaults plus a feature-specific scope no longer have to spread and concatenate at the call site — pass the extras directly:

```typescript
// Before
[...google.sensibleScopes(), GMAIL_READONLY_SCOPE]

// After
google.sensibleScopes([GMAIL_READONLY_SCOPE])
```

The zero-arg form still returns `["openid", "email", "profile"]` unchanged.
