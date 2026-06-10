---
"@neomaventures/request-context": minor
---

Add `MissingRequestContextError`. `RequestContextModule.forRoot()` now asserts
its internal marker provider resolved at `onApplicationBootstrap` and throws
this error if the module was instantiated without `forRoot()`. Apps that
already call `forRoot()` see no behaviour change.
