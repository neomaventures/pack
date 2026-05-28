/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { getRequest } from "@neoma/request-context"
import { Inject, Injectable, LoggerService } from "@nestjs/common"
import pino, { Level } from "pino"

import { LoggingConfiguration } from "../interfaces"
import { LOGGING_MODULE_OPTIONS } from "../symbols"

const REDACTED = "[REDACTED]"

/**
 * Maps NestJS log levels to Pino log levels
 */
const LEVEL_MAP = {
  verbose: "trace",
  debug: "debug",
  log: "info",
  warn: "warn",
  error: "error",
  fatal: "fatal",
}

/**
 * Application-scoped logging service that implements NestJS LoggerService interface.
 *
 * This service provides structured logging capabilities using Pino as the underlying logger.
 * It supports field redaction, configurable log levels, and custom log context that gets
 * included with every log entry.
 *
 * @remarks
 * - Application-scoped: Single instance shared across the entire application
 * - Performance optimized using Pino
 * - Supports both printf-style interpolation and object context logging
 * - Automatic field redaction for sensitive data protection
 * - For configuration other than defaults, use `LoggingModule.forRoot()`
 *
 * @defaultValue
 * - `logLevel`: 'log' (info level)
 * - `logDestination`: null (stdout)
 * - `logRedact`: [] (no redaction)
 * - `logContext`: {} (no additional context)
 *
 * @example
 * ```typescript
 * // Register once in root module via forRoot() — available everywhere
 * @Module({
 *   imports: [LoggingModule.forRoot({
 *     logLevel: 'debug',
 *     logContext: { service: 'api', version: '1.0.0' },
 *     logRedact: ['password', '*.secret']
 *   })],
 * })
 *
 * // Basic usage
 * logger.log('User login successful')
 *
 * // With context object
 * logger.log('User login', { userId: '123', method: 'oauth' })
 *
 * // Printf-style interpolation
 * logger.log('User %s logged in with %s', 'john', 'oauth')
 * ```
 */
@Injectable()
export class ApplicationLoggerService implements LoggerService {
  private readonly pino: pino.Logger

  /**
   * Creates an instance of ApplicationLoggerService.
   *
   * @param configuration - Logging configuration options including level, redaction, and context
   */
  public constructor(
    @Inject(LOGGING_MODULE_OPTIONS)
    {
      logDestination = null,
      logLevel = "log",
      logRedact = [],
      logContext = {},
    }: LoggingConfiguration = {
      logLevel: "log",
      logDestination: null,
      logRedact: [],
      logContext: {},
    },
  ) {
    this.pino = pino(
      {
        level: LEVEL_MAP[logLevel],
        redact: { paths: logRedact, censor: REDACTED },
        base: { ...logContext },
      },
      logDestination,
    )
  }

  /**
   * Log a message at info level (standard application logging).
   *
   * @param message - The message to log
   * @param optionalParams - Additional context object OR printf-style parameters
   *
   * @example
   * ```typescript
   * // Simple message
   * logger.log('User authentication successful')
   *
   * // With context object (recommended)
   * logger.log('User login', { userId: '123', method: 'oauth', ip: req.ip })
   *
   * // Printf-style interpolation
   * logger.log('User %s logged in from %s', username, ipAddress)
   * ```
   */
  public log(message: any, ...optionalParams: any[]): void {
    this.logAtLevel("info", message, ...optionalParams)
  }

  /**
   * Log a message at error level for application errors and exceptions.
   *
   * @param message - The error message to log
   * @param optionalParams - Additional context object OR printf-style parameters
   *
   * @example
   * ```typescript
   * // Simple error
   * logger.error('Database connection failed')
   *
   * // With error context (recommended)
   * logger.error('User creation failed', {
   *   userId: data.id,
   *   error: err.message,
   *   stack: err.stack
   * })
   *
   * // With error object
   * logger.error('Unexpected error occurred', { err })
   * ```
   */
  public error(message: any, ...optionalParams: any[]): void {
    this.logAtLevel("error", message, ...optionalParams)
  }

  /**
   * Log a message at warning level for non-critical issues.
   *
   * @param message - The warning message to log
   * @param optionalParams - Additional context object OR printf-style parameters
   *
   * @example
   * ```typescript
   * // Simple warning
   * logger.warn('API rate limit approaching')
   *
   * // With context
   * logger.warn('Deprecated API endpoint used', {
   *   endpoint: '/api/v1/users',
   *   deprecatedSince: '2024-01-01'
   * })
   * ```
   */
  public warn(message: any, ...optionalParams: any[]): void {
    this.logAtLevel("warn", message, ...optionalParams)
  }

  /**
   * Log a message at debug level for detailed debugging information.
   *
   * Note: When `logLevel: 'debug'`, this also enables automatic request/response logging.
   *
   * @param message - The debug message to log
   * @param optionalParams - Additional context object OR printf-style parameters
   *
   * @example
   * ```typescript
   * // Simple debug message
   * logger.debug('Cache miss for user profile')
   *
   * // With debugging context
   * logger.debug('Database query executed', {
   *   query: 'SELECT * FROM users WHERE id = ?',
   *   duration: '45ms',
   *   rows: 1
   * })
   * ```
   */
  public debug(message: any, ...optionalParams: any[]): void {
    this.logAtLevel("debug", message, ...optionalParams)
  }

  /**
   * Log a message at verbose (trace) level for extremely detailed debugging.
   *
   * @param message - The verbose message to log
   * @param optionalParams - Additional context object OR printf-style parameters
   *
   * @example
   * ```typescript
   * // Detailed tracing
   * logger.verbose('Function entry', { functionName: 'createUser', args })
   * logger.verbose('Variable state', { userId, isValid, permissions })
   * ```
   */
  public verbose(message: any, ...optionalParams: any[]): void {
    this.logAtLevel("trace", message, ...optionalParams)
  }

  /**
   * Log a message at fatal level for critical system failures.
   *
   * @param message - The fatal error message to log
   * @param optionalParams - Additional context object OR printf-style parameters
   *
   * @example
   * ```typescript
   * // System critical error
   * logger.fatal('Database connection pool exhausted')
   *
   * // With detailed context
   * logger.fatal('Application startup failed', {
   *   error: err.message,
   *   config: sanitizedConfig,
   *   exitCode: 1
   * })
   * ```
   */
  public fatal(message: any, ...optionalParams: any[]): void {
    this.logAtLevel("fatal", message, ...optionalParams)
  }

  private logAtLevel(
    level: Level,
    message: any,
    ...optionalParams: any[]
  ): void {
    const request = getRequest()

    if (optionalParams.length === 1 && typeof optionalParams[0] === "object") {
      this.pino[level]({ ...optionalParams[0], req: request }, message)
    } else {
      this.pino[level]({ req: request }, message, ...optionalParams)
    }
  }
}
