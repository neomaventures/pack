import { Module, ValidationPipe } from "@nestjs/common"
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core"

import { NeomaExceptionFilter } from "./filters/exception.filter"
import { ErrorTemplateMetadataBridge } from "./guards/error-template-metadata-bridge.guard"
import { validationFactory } from "./pipes/validation.factory"

/**
 * Global exception handling module for NestJS applications.
 *
 * A drop-in replacement for NestJS's built-in exception handling. Provides:
 * - Intelligent logging based on HTTP status codes
 * - Consistent JSON error responses
 * - Content negotiation for HTML error rendering via {@link ErrorTemplate}
 * - Automatic handling of all exceptions (HTTP and unhandled)
 * - Custom exception behavior via the {@link NeomaException} interface
 * - Global validation pipe with field-keyed error responses
 *
 * ## Required companions
 *
 * `NeomaExceptionFilter` injects `ApplicationLoggerService` from
 * `@neomaventures/logging`, so consumers **must** install `LoggingModule.forRoot()`
 * (typically alongside `RequestContextModule.forRoot()`):
 *
 * ```typescript
 * @Module({
 *   imports: [
 *     RequestContextModule.forRoot(),
 *     LoggingModule.forRoot(),
 *     ExceptionHandlerModule,
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * Once these are in place, all exceptions are automatically caught and
 * routed through `ApplicationLoggerService`. Bootstrap with
 * `NestFactory.create(AppModule, { bufferLogs: true })` and
 * `app.useLogger(app.get(ApplicationLoggerService))` to capture Nest's own
 * internal logs through the same sink.
 *
 * ## Default Logging Levels
 *
 * - 404 errors: DEBUG level
 * - 4xx errors: WARN level
 * - 5xx errors: ERROR level
 * - Unhandled exceptions: ERROR level
 *
 * ## Custom Exceptions
 *
 * Implement the {@link NeomaException} interface for full control over
 * status codes, responses, and logging behavior. All methods are optional.
 *
 * ## Content Negotiation
 *
 * Use the {@link ErrorTemplate} decorator on a route to render an HTML
 * error page when the client accepts `text/html`. API requests continue
 * to receive JSON responses.
 *
 * ## Validation
 *
 * A global `ValidationPipe` is registered with a custom factory that
 * transforms validation errors into a field-keyed shape:
 * ```json
 * { "email": { "value": "bad", "error": "must be a valid email" } }
 * ```
 *
 * @see NeomaException for the custom exception interface
 * @see NeomaExceptionFilter for detailed behavior
 * @see ErrorTemplate for HTML error rendering
 * @see validationFactory for validation error transformation
 */
@Module({
  providers: [
    { provide: APP_FILTER, useClass: NeomaExceptionFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ exceptionFactory: validationFactory }),
    },
    { provide: APP_GUARD, useClass: ErrorTemplateMetadataBridge },
  ],
  exports: [],
})
export class ExceptionHandlerModule {}
