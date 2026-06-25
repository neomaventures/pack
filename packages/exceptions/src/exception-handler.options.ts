/**
 * Options for {@link ExceptionHandlerModule}.
 *
 * Currently the only option is `errorTemplates` — a global fallback map
 * consulted by {@link NeomaExceptionFilter} when no route-level
 * `@ErrorTemplate` metadata is reachable.
 */
export interface ExceptionHandlerOptions {
  /**
   * Global fallback error templates rendered when no route-level
   * `@ErrorTemplate` is reachable (middleware-thrown exceptions, unmatched
   * routes, or guards that throw before the internal metadata bridge runs).
   *
   * Keys can be either HTTP status codes (e.g. `404`, `500`) or exception
   * class names (e.g. `"NotFoundException"`, `"BadRequestException"`).
   * `default` is required when this option is provided. Within this layer,
   * the filter resolves most-specific-first: exception-name match → status
   * match → `default`. Values starting with `/` trigger a 303 See Other
   * redirect.
   *
   * @example
   * ```typescript
   * ExceptionHandlerModule.forRoot({
   *   errorTemplates: {
   *     default: "errors/generic",
   *     NotFoundException: "errors/not-found",
   *     500: "errors/server",
   *   },
   * })
   * ```
   */
  errorTemplates?: {
    default: string
    [statusOrName: string]: string
  }
}
