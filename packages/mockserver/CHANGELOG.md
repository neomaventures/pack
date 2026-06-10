# Changelog

## 0.4.0

### Minor Changes

- 7dab5d1: Add `@neomaventures/mockserver/fixture` subpath export — a singleton `mockserver` client that auto-resets between tests via a `beforeEach` hook. Reads `MOCKSERVER_URL` from the environment.

## 0.3.0

### Minor Changes

- cfeb742: Make `MockServerClient.baseUrl` public readonly so consumers can derive URLs from the client instance.

## 0.2.0

### Minor Changes

- 66ffce1: `startContainer()` no longer sets environment variables. It returns a config object with all connection details — consumers must wire their own env vars from the returned config or use static `.env` files. See each package's updated README for the new pattern.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
