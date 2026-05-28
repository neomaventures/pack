import { ApplicationLoggerService } from "@neoma/logging"
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common"

/**
 * Global exception filter that catches all exceptions and provides
 * intelligent logging based on HTTP status codes.
 *
 * Works as a drop-in replacement for NestJS's built-in exception handling
 * with zero configuration required. Simply import `ExceptionHandlerModule`
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
 * import { NeomaException } from '@neoma/exception-handling'
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
 *   public log(logger: LoggerService): void {
 *     logger.error?.('Payment failed', { transactionId: this.transactionId })
 *   }
 * }
 * ```
 *
 * ## Custom Logging
 *
 * Implement the `log(logger)` method to override default logging behavior.
 * The logger passed is the NestJS Logger. Implementing an empty `log()`
 * method disables logging for that exception entirely.
 *
 * ## Logger Selection
 *
 * The filter always uses the NestJS Logger. To route through a custom
 * implementation:
 *
 * 1. **Overridden NestJS Logger** - Call `Logger.overrideLogger()` (or
 *    `app.useLogger(...)`) with your logger implementation.
 * 2. **Default NestJS Logger** - Falls back to the built-in ConsoleLogger.
 *
 * For structured loggers (Pino, Winston, Bunyan), logs are formatted as:
 * ```typescript
 * logger.error(message, { err })
 * ```
 *
 * For the default ConsoleLogger, the original NestJS format is preserved:
 * ```typescript
 * Logger.error(err, message, 'NeomaExceptionFilter')
 * ```
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
 * using the following priority order. Exception-declared behaviour always
 * takes priority over decorator-declared behaviour:
 *
 * | Priority | Source | Mechanism |
 * |----------|--------|-----------|
 * | 1 | Exception | `getRedirect()` — redirect with `{ status, url }` |
 * | 2 | Decorator | `@ErrorTemplate` with `/` prefix — redirect to route |
 * | 3 | Decorator | `@ErrorTemplate` — render a template |
 * | 4 | Default | JSON response via `getResponse()` |
 *
 * For non-HTML requests (API clients), the filter always returns JSON.
 *
 * ## Content Negotiation
 *
 * When both conditions are met:
 * 1. The request `Accept` header includes `text/html`
 * 2. `res.locals.errorTemplate` is set (via the {@link ErrorTemplateMetadataBridge})
 *
 * The filter resolves the template name from the {@link ErrorTemplateOptions}
 * object by matching `err.name` against the keys, falling back to `default`:
 * ```typescript
 * const templateName = errorTemplate[err.name] || errorTemplate.default
 * ```
 *
 * If the resolved template starts with `/`, the filter issues a `303 See Other`
 * redirect to that path instead of rendering. This is useful when the error
 * page lives at its own route (e.g. `/error`):
 * ```typescript
 * @ErrorTemplate({ BadRequestException: 'auth/form', default: '/error' })
 * ```
 *
 * Otherwise, the default JSON response is used. API applications are
 * completely unaffected.
 *
 * @see NeomaException for the interface to implement
 * @see ExceptionHandlerModule for registration
 * @see ErrorTemplate for the decorator that enables template rendering
 */
@Catch()
export class NeomaExceptionFilter implements ExceptionFilter {
  public constructor(private readonly logger: ApplicationLoggerService) {}

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
      this.logger.warn(
        `[${err.getStatus!()}] Request rejected - ${err.name}`,
        { err },
      )
    } else {
      this.logger.error(
        `[${err.getStatus!()}] Request failed - ${err.name}`,
        { err },
      )
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

    if (acceptsHtml && errorTemplate) {
      // A missing OR empty template name for this error should fall back to the
      // default template, so `||` (falsy fallback) is intentional here, not `??`.
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      const templateName = errorTemplate[err.name] || errorTemplate.default

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
    } else {
      response.status(err.getStatus!()).json(err.getResponse!())
    }
  }
}
