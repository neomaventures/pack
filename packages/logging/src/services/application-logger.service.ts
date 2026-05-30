import { getRequest } from "@neoma/request-context"
import { Inject, Injectable } from "@nestjs/common"
import pino, { Level } from "pino"

import { LoggingConfiguration } from "../interfaces"
import { LOGGING_MODULE_OPTIONS } from "../symbols"

const REDACTED = "[REDACTED]"

/**
 * Maps NestJS-style log level names to pino's level names.
 */
const LEVEL_MAP: Record<string, Level> = {
  verbose: "trace",
  debug: "debug",
  log: "info",
  warn: "warn",
  error: "error",
  fatal: "fatal",
}

/**
 * Context fields merged into a log entry.
 *
 * Any keys are allowed; `err` is called out as a recognised convention —
 * when present and containing an `Error`, pino's default serializer
 * extracts `{ type, message, stack }` as a structured field.
 *
 * @example
 * ```typescript
 * logger.error('Charge failed', { err, chargeId, amount })
 * logger.log('User login', { userId: '123', method: 'oauth' })
 * ```
 */
export type LogContext = {
  /**
   * Attached error. When this is an `Error`, pino's default serializer
   * extracts `{ type, message, stack }` into the log entry.
   */
  err?: unknown
} & Record<string, unknown>

/**
 * Structured application logger backed by pino.
 *
 * Every method has the same shape:
 *
 * ```ts
 * logger.<level>(message: string, context?: LogContext): void
 * ```
 *
 * The `context` object's fields are merged into the log entry alongside
 * the current request (read from `@neoma/request-context`). To attach
 * an `Error`, put it in the context as `{ err: someError }` — pino's
 * default `err` serializer extracts the stack into a structured field.
 *
 * **Not a Nest `LoggerService`.** This service deliberately does not
 * implement `@nestjs/common`'s `LoggerService` interface — it should
 * not be installed via `app.useLogger()`. Nest's own framework logs
 * stay in Nest's `ConsoleLogger`; this service is the structured logger
 * for app code and the rest of the Neoma ecosystem.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     RequestContextModule.forRoot(),
 *     LoggingModule.forRoot({
 *       logLevel: 'debug',
 *       logContext: { service: 'api', version: '1.0.0' },
 *       logRedact: ['password', '*.secret'],
 *     }),
 *   ],
 * })
 *
 * // Inject and use:
 * constructor(private readonly logger: ApplicationLoggerService) {}
 *
 * this.logger.log('User authenticated', { userId: '123' })
 * this.logger.error('Charge failed', { err, chargeId, amount })
 *
 * // Or via the static delegates (for decorators / non-DI code):
 * ApplicationLoggerService.log('Boot complete')
 * ```
 */
@Injectable()
export class ApplicationLoggerService {
  private static instance: ApplicationLoggerService | null = null

  private readonly pino: pino.Logger

  public constructor(
    @Inject(LOGGING_MODULE_OPTIONS)
    {
      logDestination = null,
      logLevel = "log",
      logRedact = [],
      logContext = {},
    }: LoggingConfiguration = {},
  ) {
    this.pino = pino(
      {
        level: LEVEL_MAP[logLevel],
        redact: { paths: logRedact, censor: REDACTED },
        base: { ...logContext },
      },
      // `logDestination` is typed `any` on LoggingConfiguration to accept
      // anything pino can write to (streams, sonic-boom, transports, etc.).
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      logDestination,
    )
    ApplicationLoggerService.instance = this
  }

  /** Log a message at info level. Equivalent to {@link info}. */
  public log(message: string, context?: LogContext): void {
    this.logAtLevel("info", message, context)
  }

  /** Log a message at info level. Equivalent to {@link log}. */
  public info(message: string, context?: LogContext): void {
    this.logAtLevel("info", message, context)
  }

  /** Log a message at warn level. */
  public warn(message: string, context?: LogContext): void {
    this.logAtLevel("warn", message, context)
  }

  /** Log a message at debug level. */
  public debug(message: string, context?: LogContext): void {
    this.logAtLevel("debug", message, context)
  }

  /** Log a message at verbose (trace) level. */
  public verbose(message: string, context?: LogContext): void {
    this.logAtLevel("trace", message, context)
  }

  /**
   * Log a message at error level. To attach an `Error`, pass it as
   * `{ err: someError }` in the context — pino's `err` serializer
   * extracts `{ type, message, stack }` automatically.
   */
  public error(message: string, context?: LogContext): void {
    this.logAtLevel("error", message, context)
  }

  /**
   * Log a message at fatal level. To attach an `Error`, pass it as
   * `{ err: someError }` in the context — pino's `err` serializer
   * extracts `{ type, message, stack }` automatically.
   */
  public fatal(message: string, context?: LogContext): void {
    this.logAtLevel("fatal", message, context)
  }

  /** Static delegate for {@link log}. No-ops if the module has not yet been constructed. */
  public static log(message: string, context?: LogContext): void {
    ApplicationLoggerService.instance?.log(message, context)
  }

  /** Static delegate for {@link info}. No-ops if the module has not yet been constructed. */
  public static info(message: string, context?: LogContext): void {
    ApplicationLoggerService.instance?.info(message, context)
  }

  /** Static delegate for {@link warn}. No-ops if the module has not yet been constructed. */
  public static warn(message: string, context?: LogContext): void {
    ApplicationLoggerService.instance?.warn(message, context)
  }

  /** Static delegate for {@link debug}. No-ops if the module has not yet been constructed. */
  public static debug(message: string, context?: LogContext): void {
    ApplicationLoggerService.instance?.debug(message, context)
  }

  /** Static delegate for {@link verbose}. No-ops if the module has not yet been constructed. */
  public static verbose(message: string, context?: LogContext): void {
    ApplicationLoggerService.instance?.verbose(message, context)
  }

  /** Static delegate for {@link error}. No-ops if the module has not yet been constructed. */
  public static error(message: string, context?: LogContext): void {
    ApplicationLoggerService.instance?.error(message, context)
  }

  /** Static delegate for {@link fatal}. No-ops if the module has not yet been constructed. */
  public static fatal(message: string, context?: LogContext): void {
    ApplicationLoggerService.instance?.fatal(message, context)
  }

  private logAtLevel(
    level: Level,
    message: string,
    context?: LogContext,
  ): void {
    const request = getRequest()
    const reqField = request ? { req: request } : {}
    this.pino[level]({ ...context, ...reqField }, message)
  }
}
