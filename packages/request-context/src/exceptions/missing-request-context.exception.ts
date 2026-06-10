/**
 * Thrown at `onApplicationBootstrap` when `RequestContextModule` was
 * instantiated without calling `RequestContextModule.forRoot()`. The module
 * registers an internal marker provider inside `forRoot()`; if Nest resolves
 * the module without that provider, bootstrap fails fast with this error
 * rather than silently returning `undefined` from `getRequest()` for every
 * request.
 *
 * Common causes:
 *
 * - Listing `RequestContextModule` directly in a module's `providers` or
 *   `imports` array instead of `RequestContextModule.forRoot()`.
 * - Wiring the module into a non-global scope the root module never imports,
 *   so the marker provider is never registered in the resolved DI graph.
 *
 * If you never import `RequestContextModule` at all, the guard does not run
 * and `getRequest()` returns `undefined` off-request as documented.
 *
 * @example Failure-mode boot log
 * ```text
 * Error: RequestContextModule was instantiated without forRoot(). ...
 *     at RequestContextModule.onApplicationBootstrap
 * ```
 *
 * @see The "Boot guard" section in the package README.
 */
export class MissingRequestContextError extends Error {
  public constructor() {
    super(
      "RequestContextModule was instantiated without forRoot(). " +
        "Import RequestContextModule.forRoot() in your root module so the " +
        "internal marker provider is registered before bootstrap.",
    )
    this.name = "MissingRequestContextError"
  }
}
