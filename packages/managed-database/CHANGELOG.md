# Changelog

## 0.2.0

### Minor Changes

- 286f944: Add `ManagedDatabaseModule.forRoot(entities?)` — a `@Global()` NestJS dynamic test module that exposes the managed test datasource under TypeORM's standard `getDataSourceToken()`. Entities are optional; omit to auto-discover every `.entity.ts` under the consumer's `src/`. Shares the per-test cache and `afterEach` teardown of `managedDatasourceInstance`.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
