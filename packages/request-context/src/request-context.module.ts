import {
  type DynamicModule,
  Inject,
  type MiddlewareConsumer,
  Module,
  type NestModule,
  type OnApplicationBootstrap,
  Optional,
} from "@nestjs/common"
import { ClsModule } from "nestjs-cls"

import { MissingRequestContextError } from "./exceptions/missing-request-context.exception"
import { RequestContextMiddleware } from "./request-context.middleware"

/**
 * Module-private marker token. Registered by `forRoot()` and asserted at
 * `onApplicationBootstrap`. Intentionally not exported — this is an internal
 * invariant, not a public API.
 */
const REQUEST_CONTEXT_MARKER = Symbol("REQUEST_CONTEXT_MARKER")

/**
 * Per-request context for NestJS, backed by `AsyncLocalStorage` via
 * `nestjs-cls`. Import `RequestContextModule.forRoot()` once in your root
 * module to open one context per request; then call {@link getRequest} anywhere
 * below the controller boundary to read the live request — no `@Req()`, no
 * `Scope.REQUEST`, no threading `req` through your call stack.
 *
 * `forRoot()` takes no options: there is nothing to configure in this version,
 * so it is intentionally hand-rolled rather than built with
 * `ConfigurableModuleBuilder`, and there is no `forRootAsync`.
 *
 * @example Mount once at the root
 * ```typescript
 * @Module({
 *   imports: [RequestContextModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class RequestContextModule
  implements NestModule, OnApplicationBootstrap
{
  public constructor(
    @Optional()
    @Inject(REQUEST_CONTEXT_MARKER)
    private readonly marker?: true,
  ) {}

  /**
   * Wire the request-context boundary into your application.
   *
   * Imports `ClsModule.forRoot()` (global, so `ClsService` is injectable
   * app-wide and the static handle resolves everywhere) without mounting cls's
   * own middleware — {@link RequestContextMiddleware} is the single context
   * boundary.
   *
   * Also registers an internal marker provider that is asserted at
   * `onApplicationBootstrap`. If the module is instantiated without
   * `forRoot()`, bootstrap fails with {@link MissingRequestContextError}.
   *
   * @returns A dynamic module to add to your root module's `imports`.
   *
   * @example
   * ```typescript
   * imports: [RequestContextModule.forRoot()]
   * ```
   */
  public static forRoot(): DynamicModule {
    return {
      module: RequestContextModule,
      global: true,
      imports: [
        ClsModule.forRoot({ global: true, middleware: { mount: false } }),
      ],
      providers: [
        RequestContextMiddleware,
        { provide: REQUEST_CONTEXT_MARKER, useValue: true },
      ],
    }
  }

  /**
   * Mounts the boundary middleware on every route so each request runs inside
   * its own `AsyncLocalStorage` context. Fails fast if the module was
   * instantiated without `forRoot()` — the middleware cannot be resolved
   * without `ClsService`, so we throw a deterministic, named error here rather
   * than letting Nest surface an opaque DI exception.
   *
   * @throws {@link MissingRequestContextError} when the module was
   * instantiated without `forRoot()`.
   */
  public configure(consumer: MiddlewareConsumer): void {
    if (this.marker !== true) {
      throw new MissingRequestContextError()
    }
    consumer.apply(RequestContextMiddleware).forRoutes("*")
  }

  /**
   * Asserts the internal marker provider resolved. If the marker is not
   * registered (i.e. `forRoot()` was not called), bootstrap fails fast.
   *
   * @throws {@link MissingRequestContextError} when the module was
   * instantiated without `forRoot()`.
   */
  public onApplicationBootstrap(): void {
    if (this.marker !== true) {
      throw new MissingRequestContextError()
    }
  }
}
