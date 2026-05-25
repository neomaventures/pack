---
"@neoma/logging": patch
---

Broaden the `express` peer dependency from `^4` to `>=4`. The middleware uses only the stable `Request`/`Response`/`NextFunction` surface and the package builds and tests cleanly against Express 5, so it now declares support for both Express 4 and 5.
