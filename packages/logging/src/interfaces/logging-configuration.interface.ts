import { type LogLevel, type ModuleMetadata } from "@nestjs/common"

/**
 * Configuration options for the LoggingModule.
 *
 * Used with `LoggingModule.forRoot()` to customize logging behavior including
 * log levels, field redaction, context injection, and request tracing.
 *
 * @example
 * ```typescript
 * LoggingModule.forRoot({
 *   logLevel: 'debug',
 *   logContext: { service: 'api', version: '1.0.0' },
 *   logRedact: ['password', '*.secret'],
 *   logRequestTraceIdHeader: 'x-trace-id'
 * })
 * ```
 */
export interface LoggingConfiguration {
  /**
   * The minimum log level to capture. Available levels in order of priority:
   * - `'verbose'` (trace) - Most detailed
   * - `'debug'` - Enables automatic request/response logging
   * - `'log'` (info) - Standard application logs
   * - `'warn'` - Warning messages
   * - `'error'` - Error messages
   * - `'fatal'` - Critical errors
   *
   * Only logs at the specified level and above will be captured.
   *
   * @default 'log'
   */
  logLevel?: LogLevel

  /**
   * Custom destination for log output. Primarily used for testing with
   * memory streams or directing output to custom transports.
   *
   * @default process.stdout
   */
  logDestination?: any

  /**
   * Array of field paths to redact from log entries for privacy/security.
   * Supports dot notation and wildcards for nested object redaction.
   *
   * @example
   * ```typescript
   * logRedact: [
   *   'password',           // Top-level password field
   *   '*.secret',          // secret field in any object
   *   'user.credentials',  // Nested path
   *   'tokens.*.value'     // Wildcard for array/object items
   * ]
   * ```
   *
   * @default []
   */
  logRedact?: Array<string>

  /**
   * Additional context object to include with every log entry.
   * Useful for adding service metadata, version info, environment details.
   *
   * This context is automatically merged into all logs from both
   * ApplicationLoggerService and RequestLoggerService.
   *
   * @example
   * ```typescript
   * logContext: {
   *   service: 'user-api',
   *   version: '1.2.3',
   *   environment: 'production'
   * }
   * ```
   *
   * @default {}
   */
  logContext?: any

  /**
   * Optional header name to extract trace ID from incoming requests.
   * Performs case-insensitive lookup and auto-generates ULID if header is missing.
   * When configured but header is not found, a warning will be logged.
   *
   * @example 'x-correlation-id', 'x-trace-id', 'x-request-id'
   * @default null
   */
  logRequestTraceIdHeader?: string

  /**
   * Whether to log errors caught by the RequestLoggerInterceptor
   * @default false
   */
  logErrors?: boolean
}

/**
 * Options for `LoggingModule.forRootAsync()` — resolve the
 * {@link LoggingConfiguration} from DI (e.g. a `ConfigService`).
 */
export interface LoggingModuleAsyncOptions {
  /** Modules to import so the factory's injected dependencies are available. */
  imports?: ModuleMetadata["imports"]
  /** Providers to inject into `useFactory`. */
  inject?: any[]
  /** Factory that returns the logging configuration. */
  useFactory: (
    ...args: any[]
  ) => LoggingConfiguration | Promise<LoggingConfiguration>
}
