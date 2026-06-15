import { getRequest } from "@neomaventures/request-context"
import { Inject, Injectable } from "@nestjs/common"
import pino from "pino"

import {
  type LogContext,
  type Logger,
  type LogLevel,
} from "../interfaces/logger.interface"
import { type LoggingModuleOptions } from "../interfaces/logging-module-options.interface"
import { LOGGING_MODULE_OPTIONS } from "../symbols"

const REDACTED = "[REDACTED]"

/**
 * App-wide default logger. The class itself doubles as its DI token —
 * `@Inject(ApplicationLogger)` (or `@InjectLogger()`) resolves an instance.
 *
 * - Bound to `LoggingModuleOptions.defaultLevel` (default `'info'`) with no
 *   namespace.
 * - Retains the **static delegate** pattern: `ApplicationLogger.info(...)`,
 *   `ApplicationLogger.error(...)`, etc., write through the most recently
 *   constructed instance. Static calls before the module boots are no-ops.
 *   Provided for code paths that cannot use DI (bootstrap, top-level scripts).
 *
 * @see Logger — the instance method contract.
 *
 * @example
 * ```ts
 * // DI usage
 * constructor(@InjectLogger() private readonly logger: ApplicationLogger) {}
 *
 * // Static usage (bootstrap, no DI available)
 * ApplicationLogger.info("server starting", { port })
 * ```
 */
@Injectable()
export class ApplicationLogger implements Logger {
  private static instance: ApplicationLogger | null = null

  private readonly pino: pino.Logger

  public constructor(
    @Inject(LOGGING_MODULE_OPTIONS)
    {
      destination = null,
      defaultLevel = "info",
      redact = [],
      context = {},
    }: LoggingModuleOptions = {},
  ) {
    this.pino = pino(
      {
        level: defaultLevel,
        redact: { paths: [...redact], censor: REDACTED },
        base: { ...context },
      },
      // `destination` is typed `any` on LoggingModuleOptions to accept
      // anything pino can write to (streams, sonic-boom, transports, etc.).
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      destination,
    )
    ApplicationLogger.instance = this
  }

  /** @inheritDoc */
  public trace(message: string, context?: LogContext): void {
    this.logAtLevel("trace", message, context)
  }

  /** @inheritDoc */
  public debug(message: string, context?: LogContext): void {
    this.logAtLevel("debug", message, context)
  }

  /** @inheritDoc */
  public info(message: string, context?: LogContext): void {
    this.logAtLevel("info", message, context)
  }

  /** @inheritDoc */
  public warn(message: string, context?: LogContext): void {
    this.logAtLevel("warn", message, context)
  }

  /** @inheritDoc */
  public error(message: string, context?: LogContext): void {
    this.logAtLevel("error", message, context)
  }

  /** @inheritDoc */
  public fatal(message: string, context?: LogContext): void {
    this.logAtLevel("fatal", message, context)
  }

  /**
   * Static delegate for {@link ApplicationLogger#trace}. Routes through the
   * most recently constructed instance; no-op before the module boots.
   */
  public static trace(message: string, context?: LogContext): void {
    ApplicationLogger.instance?.trace(message, context)
  }

  /** @see ApplicationLogger.trace */
  public static debug(message: string, context?: LogContext): void {
    ApplicationLogger.instance?.debug(message, context)
  }

  /** @see ApplicationLogger.trace */
  public static info(message: string, context?: LogContext): void {
    ApplicationLogger.instance?.info(message, context)
  }

  /** @see ApplicationLogger.trace */
  public static warn(message: string, context?: LogContext): void {
    ApplicationLogger.instance?.warn(message, context)
  }

  /** @see ApplicationLogger.trace */
  public static error(message: string, context?: LogContext): void {
    ApplicationLogger.instance?.error(message, context)
  }

  /** @see ApplicationLogger.trace */
  public static fatal(message: string, context?: LogContext): void {
    ApplicationLogger.instance?.fatal(message, context)
  }

  private logAtLevel(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): void {
    const request = getRequest()
    const reqField = request ? { req: request } : {}
    this.pino[level]({ ...context, ...reqField }, message)
  }
}
