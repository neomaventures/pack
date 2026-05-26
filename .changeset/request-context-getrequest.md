---
"@neoma/request-context": minor
---

Initial release of `@neoma/request-context`. Import `RequestContextModule.forRoot()` once in your root module to open one `AsyncLocalStorage` context per request, then call `getRequest()` anywhere below the controller boundary — deep singletons, repositories, listeners — to read the live request with no `@Req()`, no `Scope.REQUEST`, and no threading `req` through your call stack. Returns `undefined` off-request (never throws), keeps concurrent requests isolated.
