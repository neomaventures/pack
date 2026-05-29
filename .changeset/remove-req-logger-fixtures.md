---
"@neoma/fixtures": patch
---

`MockRequest` now declares `logger?: never` — passing `logger` to `express.request({...})` is a type error, and `req.logger` is typed as `never`. Loggers are no longer attached to requests in the Neoma ecosystem; use `Logger.overrideLogger(new MockLoggerService())` in specs instead.

`MockLoggerService` is unchanged and remains the canonical fixture for mocking the Nest static `Logger`.
