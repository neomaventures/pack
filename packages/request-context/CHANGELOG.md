# Changelog

## Unreleased

### Added
- `RequestContextModule.forRoot()` — opens one `AsyncLocalStorage` context per request via a boundary middleware (`cls.run()`, never `enterWith()`). Takes no options.
- `getRequest()` — reads the live request anywhere below the controller boundary; returns `undefined` off-request and never throws.
- `MissingRequestContextError` — branded boot-time error thrown when the request-context boundary was not wired (`RequestContextModule.forRoot()` missing).
