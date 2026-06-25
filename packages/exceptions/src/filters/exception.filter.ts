import { ApplicationLogger } from "@neomaventures/logging"
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Inject,
} from "@nestjs/common"

import { MODULE_OPTIONS_TOKEN } from "../exception-handler.module-definition"
import { type ExceptionHandlerOptions } from "../exception-handler.options"

/**
 * Global exception filter that catches all exceptions and provides
 * intelligent logging based on HTTP status codes.
 *
 * Works as a drop-in replacement for NestJS's built-in exception handling
 * with zero configuration required. Call `ExceptionHandlerModule.forRoot({})`
 * and all exceptions are handled automatically.
 *
 * ## Design Principle
 *
 * The filter follows a **dynamic over static over defaults** priority:
 *
 * 1. **Dynamic** — the exception declares behaviour at runtime via
 *    {@link NeomaException} methods (`getStatus`, `getResponse`, `getRedirect`, `log`)
 * 2. **Static** — route-level configuration set at definition time via
 *    decorators like `@ErrorTemplate`
 * 3. **Defaults** — framework defaults (500 status, generic JSON, status-based logging)
 *
 * ## Custom Exceptions
 *
 * Implement the {@link NeomaException} interface to create custom exceptions
 * with full control over status, response, and logging. All methods are
 * optional - unimplemented methods use Neoma defaults:
 *
 * | Method | Static fallback | Default |
 * |--------|----------------|---------|
 * | `getStatus()` | — | 500 Internal Server Error |
 * | `getResponse()` | — | Generic 500 JSON response |
 * | `log()` | — | Status-based logging (DEBUG/WARN/ERROR) |
 * | `getRedirect()` | `@ErrorTemplate` `/` prefix | No redirect |
 *
 * @example
 * ```typescript
 * import { NeomaException } from '@neomaventures/exceptions'
 *
 * export class PaymentFailedException extends Error implements NeomaException {
 *   constructor(private transactionId: string) {
 *     super('Payment failed')
 *     this.name = 'PaymentFailedException'
 *   }
 *
 *   public getStatus(): number {
 *     return HttpStatus.PAYMENT_REQUIRED
 *   }
 *
 *   public getResponse(): object {
 *     return {
 *       statusCode: HttpStatus.PAYMENT_REQUIRED,
 *       message: this.message,
 *       error: 'Payment Required',
 *     }
 *   }
 *
 *   public log(logger: ApplicationLogger): void {
 *     logger.error('Payment failed', { transactionId: this.transactionId })
 *   }
 * }
 * ```
 *
 * ## Custom Logging
 *
 * Implement the `log(logger)` method to override default logging behavior.
 * The logger passed is the injected `ApplicationLogger` from
 * `@neomaventures/logging`. Implementing an empty `log()` method disables logging
 * for that exception entirely.
 *
 * ## Logger Setup
 *
 * The filter depends on `ApplicationLogger` via DI, so consumers
 * **must** install `LoggingModule.forRoot()` (typically alongside
 * `RequestContextModule.forRoot()` for request-scoped log fields):
 *
 * ```typescript
 * imports: [
 *   RequestContextModule.forRoot(),
 *   LoggingModule.forRoot({ logLevel: 'debug' }),
 *   ExceptionHandlerModule.forRoot({}),
 * ]
 * ```
 *
 * All filter logs (and any consumer-implemented `log()` callbacks) flow
 * through the same `ApplicationLogger` — structured `(message, { err })`
 * calls land as structured log entries.
 *
 * ## Default Logging Strategy
 *
 * When no `log()` method is implemented, the filter logs based on status code:
 *
 * | Status Code | Log Level | Rationale |
 * |-------------|-----------|-----------|
 * | 404 | DEBUG | Expected in normal operation (bots, typos) |
 * | 400-499 | WARN | Client errors worth monitoring |
 * | 500-599 | ERROR | Server errors needing immediate attention |
 * | Non-HTTP | ERROR | Unhandled exceptions, critical |
 *
 * ## Response Format
 *
 * For exceptions with `getResponse()`, returns that response directly.
 * For exceptions without, returns a generic 500 response:
 * ```json
 * {
 *   "statusCode": 500,
 *   "message": "Internal server error",
 *   "error": "Internal Server Error"
 * }
 * ```
 *
 * ## Exception-Level Redirects
 *
 * When both conditions are met:
 * 1. The request `Accept` header includes `text/html`
 * 2. The exception implements `getRedirect()` returning `{ status, url }`
 *
 * The filter redirects the client using the provided status code and URL.
 * This takes priority over `@ErrorTemplate` — the exception knows where
 * the user should go.
 *
 * If `getRedirect()` returns an invalid value (missing `url` or `status`),
 * the filter logs a warning and falls through to default handling.
 *
 * ```typescript
 * import { HttpStatus } from '@nestjs/common'
 *
 * export class UnauthenticatedException extends Error implements NeomaException {
 *   public getRedirect(): { status: number; url: string } {
 *     return { status: HttpStatus.SEE_OTHER, url: '/login' }
 *   }
 * }
 * ```
 *
 * ## Response Priority
 *
 * When the request accepts `text/html`, the filter resolves the response
 * using the following four-tier ladder. Exception-declared behaviour always
 * takes priority over decorator-declared behaviour, which in turn takes
 * priority over module-level configuration:
 *
 * | Priority | Source | Mechanism |
 * |----------|--------|-----------|
 * | 1 | Exception | `getRedirect()` — redirect with `{ status, url }` |
 * | 2 | Route decorator | `@ErrorTemplate` matched template (or `/` prefix → redirect) |
 * | 3 | Module options | `forRoot({ errorTemplates })` matched by HTTP status, then `default` |
 * | 4 | Default | JSON response via `getResponse()` |
 *
 * For non-HTML requests (API clients), the filter always returns JSON.
 *
 * ## Content Negotiation
 *
 * Two metadata sources can supply a template name when the request accepts
 * `text/html`:
 *
 * 1. **Route-level `@ErrorTemplate`** — surfaced as `res.locals.errorTemplate`
 *    by the {@link ErrorTemplateMetadataBridge} internal `APP_GUARD`. Keyed
 *    by `err.name`, falling back to `default`:
 *    ```typescript
 *    const templateName = errorTemplate[err.name] || errorTemplate.default
 *    ```
 * 2. **Global `forRoot({ errorTemplates })`** — consulted when no
 *    route-level metadata reached the response (middleware-thrown
 *    exceptions, unmatched routes, throwing guards registered before the
 *    bridge). Keyed by exception name or HTTP status, resolved
 *    most-specific-first (name → status → `default`):
 *    ```typescript
 *    const templateName =
 *      errorTemplates[err.name] ||
 *      errorTemplates[err.getStatus()] ||
 *      errorTemplates.default
 *    ```
 *
 * If the resolved template starts with `/`, the filter issues a `303 See Other`
 * redirect to that path instead of rendering. This applies to both sources.
 *
 * Otherwise, the default JSON response is used. API applications are
 * completely unaffected.
 *
 * ## Global Fallback
 *
 * `forRoot({ errorTemplates })` provides a safety net for exceptions thrown
 * outside the request-handler pipeline, where route-level metadata is never
 * reachable. Both sources support exception-name keying; the global source
 * additionally supports HTTP-status keying for the "catch-all by status"
 * case at the app boundary. Within the global source, resolution is
 * most-specific-first: exception name → HTTP status → `default`.
 *
 * Route metadata, when present, always wins. The global fallback is only
 * consulted when `res.locals.errorTemplate` is absent or its lookup
 * produced no match.
 *
 * @see NeomaException for the interface to implement
 * @see ExceptionHandlerModule for registration
 * @see ErrorTemplate for the decorator that enables template rendering
 */
@Catch()
export class NeomaExceptionFilter implements ExceptionFilter {
  public constructor(
    private readonly logger: ApplicationLogger,
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: ExceptionHandlerOptions,
  ) {}

  /**
   * Catches and handles all exceptions thrown in the application.
   *
   * Normalizes exceptions using duck-typing: if the exception has `getStatus()`
   * and `getResponse()` methods, those are used. Otherwise, defaults to a
   * 500 Internal Server Error response.
   *
   * Logs the exception at the appropriate level based on status code,
   * then responds to the client — rendering an error template when the
   * request accepts HTML and an error template is set, or returning
   * JSON otherwise.
   *
   * @param err - The caught exception. Can be any object with a `name` property.
   *              If it has `getStatus()` and `getResponse()` methods, they will be used.
   * @param host - The NestJS arguments host providing access to the request/response context.
   */
  public catch(
    err: Error & {
      getStatus?: () => HttpStatus
      getResponse?: () => any
      getRedirect?: () => { status: number; url: string } | undefined
    },
    host: ArgumentsHost,
  ): void {
    const request = host.switchToHttp().getRequest()
    const response = host.switchToHttp().getResponse()

    if ("getStatus" in err === false) {
      err["getStatus"] = (): HttpStatus.INTERNAL_SERVER_ERROR =>
        HttpStatus.INTERNAL_SERVER_ERROR
    }

    if ("getResponse" in err === false) {
      err["getResponse"] = (): any => ({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
        error: "Internal Server Error",
      })
    }

    if ("log" in err === true && typeof err.log === "function") {
      err.log(this.logger)
    } else if (err.getStatus!() === HttpStatus.NOT_FOUND) {
      this.logger.debug(
        `[${err.getStatus!()}] Resource not found - ${err.name}`,
        { err },
      )
    } else if (err.getStatus!() < HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.warn(`[${err.getStatus!()}] Request rejected - ${err.name}`, {
        err,
      })
    } else {
      this.logger.error(`[${err.getStatus!()}] Request failed - ${err.name}`, {
        err,
      })
    }

    const acceptsHtml = request.headers?.accept?.includes("text/html")
    const errorTemplate = response.locals?.errorTemplate

    if (acceptsHtml && typeof err.getRedirect === "function") {
      const redirect = err.getRedirect()
      if (redirect?.url && redirect?.status) {
        this.logger.debug(
          `Redirecting [${err.getStatus!()}] to "${redirect.url}" with ${redirect.status}`,
          { err },
        )
        response.redirect(redirect.status, redirect.url)
        return
      }
      this.logger.warn(
        `getRedirect() returned an invalid value — falling through to default handling`,
        { err },
      )
    }

    if (acceptsHtml) {
      // Tier 1: route-level @ErrorTemplate (via bridge), keyed by err.name.
      // A missing OR empty template name for this error should fall back to the
      // default template, so `||` (falsy fallback) is intentional here, not `??`.
      let routeTemplate: string | undefined
      if (errorTemplate) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        routeTemplate = errorTemplate[err.name] || errorTemplate.default
      }

      // Tier 2: global forRoot fallback. Keys can be exception names or HTTP
      // status codes; resolution is most-specific-first (name → status → default).
      let globalTemplate: string | undefined
      const globalTemplates = this.options.errorTemplates
      if (!routeTemplate && globalTemplates) {
        const status = err.getStatus!()
        globalTemplate =
          globalTemplates[err.name] ||
          globalTemplates[status] ||
          globalTemplates.default
      }

      const templateName = routeTemplate ?? globalTemplate

      if (templateName) {
        if (templateName.startsWith("/")) {
          this.logger.debug(
            `Redirecting to "${templateName}" for [${err.getStatus!()}]`,
            { err },
          )
          response.redirect(HttpStatus.SEE_OTHER, templateName)
        } else {
          this.logger.debug(
            `Rendering error template "${templateName}" for [${err.getStatus!()}]`,
            { err },
          )
          response.status(err.getStatus!()).render(templateName, {
            ...response.locals,
            exception: err.getResponse!(),
          })
        }
        return
      }
    }

    response.status(err.getStatus!()).json(err.getResponse!())
  }
}
