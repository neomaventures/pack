# Changelog

## 0.2.0

### Minor Changes

- d934741: Add `ExceptionHandlerModule.forRoot({ errorTemplates })` — a global error-template fallback rendered when no route-level `@ErrorTemplate` is reachable. Covers middleware-thrown exceptions, the `APP_GUARD`-ordering edge documented previously, and unmatched routes.

  Resolution ladder: exception `getRedirect()` → route-level `@ErrorTemplate` → `forRoot` `errorTemplates[status]` → `errorTemplates.default` → JSON. Route-level decoration always wins over global config; exception-declared redirects always win over both.

  **Breaking change (pre-1.0):** bare `imports: [ExceptionHandlerModule]` no longer compiles. Replace with `imports: [ExceptionHandlerModule.forRoot({})]` to preserve current behaviour, or pass `errorTemplates` to opt into the new fallback.

- d934741: `ErrorTemplateMetadataBridge` is no longer exported from the package. The class remains in place internally and continues to be registered as an `APP_GUARD` by `ExceptionHandlerModule` — this is a pre-1.0 surface cleanup with no known consumers and no runtime change.

## 0.1.3

## 0.1.2

## 0.1.1

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
