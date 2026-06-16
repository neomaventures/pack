# Changelog

## 0.4.0

### Minor Changes

- 6f9825f: **BREAKING**: `MockLoggerService` has been removed from `@neomaventures/fixtures`. The mock has moved to `@neomaventures/logging/testing` and been renamed `MockLogger` — it belongs with the `Logger` contract it implements, and the move removes the `fixtures` ↔ `logging` workspace cycle.

  Consumers:

  ```ts
  // before
  import { MockLoggerService } from "@neomaventures/fixtures"
  const logger = new MockLoggerService()

  // after
  import { MockLogger } from "@neomaventures/logging/testing"
  const logger = new MockLogger()
  ```

  The mock still implements the `Logger` interface — six jest-mock methods (`trace`, `debug`, `info`, `warn`, `error`, `fatal`).

## 0.3.0

### Minor Changes

- 7b82a2a: Add `getType()` to `executionContext`. Defaults to `"http"` (the overwhelmingly common case) and accepts an optional 5th positional parameter to override (e.g. `"rpc"`, `"ws"`) for exercising non-HTTP code paths — needed when testing interceptors or guards that should branch on context type.

## 0.2.0

### Minor Changes

- 970bdf1: Add `callHandler()` helper for interceptor specs — creates a `CallHandler` that emits a given value via `of()`.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
