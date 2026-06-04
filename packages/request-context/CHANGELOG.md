# Changelog

## 0.3.0

### Minor Changes

- b72c273: Add `NoContextError` — thrown by `set()` when called outside an active request context, with the original error preserved as `cause`. Also adds `ContextSlotPrimitiveError` for proxy access on primitive-typed slots.

## 0.2.0

### Minor Changes

- ec26647: Add `createContextSlot<T>(key)` factory for building typed, per-request ALS slots. Returns five forms: `get`/`set` accessors, a `param` decorator, a DI injection `token`, and a `provider` with a per-request proxy. Consumer packages use this to define their own context concerns (principal, tenant, actor, etc.) without coupling to nestjs-cls internals. Refactors `getRequest()`/`setRequest()` to use `createContextSlot` internally.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
