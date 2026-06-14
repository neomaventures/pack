---
"@neomaventures/storage": patch
---

Fix `MultipartMiddleware` dropping the caller's `AsyncLocalStorage` frame for multipart bodies whose parsing spans multiple event-loop ticks (typically > ~100KB).

Multer captures its callback and invokes it later from a stream `"finish"` event whose async context is Node's HTTP parser, not the ALS frame opened by upstream middleware. Without rebinding, ALS-backed reads in downstream guards, interceptors, or handlers (e.g. `getPrincipal()` from `@neomaventures/auth`) return `undefined` for any request large enough to span ticks.

The fix wraps multer's callback in `AsyncResource.bind(...)`, restoring the original async context when the callback fires. No API change. See multer #814 and the new `e2e/core/upload/als-propagation.e2e-spec.ts` regression spec.
