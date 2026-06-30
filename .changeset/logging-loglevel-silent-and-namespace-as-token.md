---
"@neomaventures/logging": minor
---

`LogLevel` is now a const-object exposing `Trace`, `Debug`, `Info`, `Warn`, `Error`, `Fatal`, and the new `Silent`. Consumers reference levels via importable identifiers (`LogLevel.Debug`) rather than magic strings. The `LogLevel` type still resolves to the string union (now seven values) so existing string-literal call sites continue to typecheck.

`Silent` suppresses all output at that namespace — pack packages adopting `@neomaventures/logging` declare `level: LogLevel.Silent` in their `forFeature` so they emit nothing unless the consumer explicitly overrides via `forRoot({ loggers: [{ namespace, level }] })`.

The internal `getLoggerToken` indirection is removed. `@InjectLogger(namespace)` now uses the namespace string directly as the DI token, and `forFeature` registers providers keyed on the namespace. Test-time substitution is now trivial:

```ts
Test.createTestingModule({ providers: [...] })
  .overrideProvider(NAMESPACE)
  .useValue(new MockLogger())
```

No consumer code change needed — `getLoggerToken` was never exported from the barrel. Existing `@InjectLogger(NAMESPACE)` call sites and `LoggingModule.forFeature([{ namespace, level }])` registrations continue to work unchanged.
