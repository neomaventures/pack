---
"@neoma/fixtures": minor
---

`MockRequest` is now anchored to Express's own `Request` type — `Pick<Request, "body" | "method" | "url" | "path" | "params" | "signedCookies" | "headers"> & { … }` — so the editor surfaces the real request field names and types when you call `express.request({ … })`, while the `[key: string]: any` index signature still lets you set arbitrary extra properties. This adds `@types/express` (`>=4`) as a peer dependency. Behaviour is unchanged; only the type surface is more precise.
