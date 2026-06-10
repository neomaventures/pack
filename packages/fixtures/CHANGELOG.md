# Changelog

## 0.3.0

### Minor Changes

- 7b82a2a: Add `getType()` to `executionContext`. Defaults to `"http"` (the overwhelmingly common case) and accepts an optional 5th positional parameter to override (e.g. `"rpc"`, `"ws"`) for exercising non-HTTP code paths — needed when testing interceptors or guards that should branch on context type.

## 0.2.0

### Minor Changes

- 970bdf1: Add `callHandler()` helper for interceptor specs — creates a `CallHandler` that emits a given value via `of()`.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
