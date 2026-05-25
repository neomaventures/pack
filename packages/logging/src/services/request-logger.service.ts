import { Inject, Injectable, Scope } from "@nestjs/common"
import { REQUEST } from "@nestjs/core"
import { ulid } from "ulid"

import { LoggingConfiguration } from "../interfaces"
import { LOGGING_MODULE_OPTIONS } from "../symbols"

import { ApplicationLoggerService } from "./application-logger.service"

/**
 * Request-scoped logging service that automatically includes request context.
 *
 * This service extends ApplicationLoggerService and automatically merges the current
 * HTTP request object into the log context. Each request gets its own instance of
 * this logger, ensuring request-specific context is always included.
 *
 * @remarks
 * - Request-scoped: New instance created for each HTTP request
 * - Automatically includes request details (method, URL, headers, etc.)
 * - Generates unique ULID requestTraceId for request correlation
 * - Supports extracting trace IDs from request headers with case-insensitive lookup
 * - Auto-generates ULID fallback when configured header is missing
 * - Logs warning when configured header is not found
 * - Merges with application-level logContext from configuration
 * - Inherits all logging capabilities from ApplicationLoggerService
 *
 * @example
 * ```typescript
 * // Inject into controllers/services
 * constructor(private logger: RequestLoggerService) {}
 *
 * // Every log will include application context, request context, and trace ID
 * this.logger.log('User authenticated')
 * // Includes: logContext (service, version), requestTraceId, req (method, URL, headers)
 * this.logger.error('Validation failed', { field: 'email' })
 * // Includes: logContext, requestTraceId, req, plus the field parameter
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class RequestLoggerService extends ApplicationLoggerService {
  /**
   * Creates an instance of RequestLoggerService.
   *
   * @param options - Logging configuration from LoggingModule.forRoot()
   * @param req - The current HTTP request object (injected by NestJS)
   */
  public constructor(
    @Inject(LOGGING_MODULE_OPTIONS)
    options: LoggingConfiguration,
    @Inject(REQUEST) req: any,
  ) {
    const traceId = options.logRequestTraceIdHeader
      ? // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- an empty ("") or missing trace-id header should mint a new id, so the falsy check is intentional
        req.get(options.logRequestTraceIdHeader) || ulid()
      : ulid()

    const shouldWarnAboutMissingHeader =
      options.logRequestTraceIdHeader &&
      !req.get(options.logRequestTraceIdHeader)

    super({
      ...options,
      logContext: {
        requestTraceId: traceId,
        ...options.logContext,
        req,
      },
    })

    if (shouldWarnAboutMissingHeader) {
      this.warn(
        `Request Trace Header '${options.logRequestTraceIdHeader}' not found, auto-generating trace ID: ${traceId}`,
      )
    }
  }
}
