import { getRequest } from "@neomaventures/request-context"
import { Inject, Injectable } from "@nestjs/common"
import pino from "pino"

import { type LoggerConfig } from "../interfaces/logger-config.interface"
import {
  type LogContext,
  type Logger,
  type LogLevel,
} from "../interfaces/logger.interface"
import { type LoggingModuleOptions } from "../interfaces/logging-module-options.interface"
import { LOGGING_MODULE_OPTIONS } from "../symbols"

import { ApplicationLogger } from "./application-logger"

const REDACTED = "[REDACTED]"
const NAMESPACED_FLOOR: LogLevel = "error"
const APP_DEFAULT: LogLevel = "info"

/**
 * Wraps a pino logger in the {@link Logger} contract, attaching the current
 * request from `@neomaventures/request-context` to every entry.
 */
const wrap = (instance: pino.Logger): Logger => {
  const emit = (
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): void => {
    const request = getRequest()
    const reqField = request ? { req: request } : {}
    instance[level]({ ...context, ...reqField }, message)
  }
  return {
    trace: (m, c) => emit("trace", m, c),
    debug: (m, c) => emit("debug", m, c),
    info: (m, c) => emit("info", m, c),
    warn: (m, c) => emit("warn", m, c),
    error: (m, c) => emit("error", m, c),
    fatal: (m, c) => emit("fatal", m, c),
  }
}

/**
 * Builds {@link Logger} instances backed by a shared pino root configured
 * from {@link LoggingModuleOptions}. Provided automatically by
 * `LoggingModule.forRoot`; consumers normally do not instantiate this
 * directly — {@link LoggingModule.forFeature} calls `create` under the hood
 * and {@link ApplicationLogger} is built from `createApplicationLogger`.
 *
 * @see LoggingModule.forRoot
 * @see LoggingModule.forFeature
 */
@Injectable()
export class LoggerFactory {
  private readonly root: pino.Logger
  private readonly overrides: Map<string, LogLevel>

  /**
   * @param options - The resolved root options, injected from the internal
   *   `LOGGING_MODULE_OPTIONS` token.
   */
  public constructor(
    @Inject(LOGGING_MODULE_OPTIONS)
    private readonly options: LoggingModuleOptions = {},
  ) {
    const { destination = null, redact = [], context = {} } = options
    this.root = pino(
      {
        // Lowest possible level on the root — per-child levels enforce filtering.
        level: "trace",
        redact: { paths: [...redact], censor: REDACTED },
        base: { ...context },
      },
      // `destination` is typed `any` on LoggingModuleOptions to accept
      // anything pino can write to (streams, sonic-boom, transports, etc.).
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      destination,
    )
    this.overrides = new Map(
      (options.loggers ?? []).map((c) => [
        c.namespace,
        c.level ?? NAMESPACED_FLOOR,
      ]),
    )
  }

  /**
   * Build a namespaced logger.
   *
   * Resolves the effective level honouring the precedence chain:
   *
   * 1. `LoggingModuleOptions.loggers[namespace].level` (app override).
   * 2. The `config.level` passed here (package default from `forFeature`).
   * 3. Built-in `'error'` floor.
   *
   * `LoggingModuleOptions.defaultLevel` is **not** consulted — it applies to
   * {@link ApplicationLogger} only.
   *
   * @param config - Namespace and optional package-default level / name.
   * @returns A pino child logger satisfying {@link Logger}.
   *
   * @example
   * ```ts
   * const log = factory.create({ namespace: "neomaventures:auth" })
   * log.info("user signed in", { userId })
   * ```
   */
  public create(config: LoggerConfig): Logger {
    const level =
      this.overrides.get(config.namespace) ?? config.level ?? NAMESPACED_FLOOR
    const child = this.root.child(
      { ns: config.namespace, ...(config.name ? { name: config.name } : {}) },
      { level },
    )
    return wrap(child)
  }

  /**
   * Build the singleton {@link ApplicationLogger}. Called once per app by
   * the `ApplicationLogger` provider registered in `forRoot`. Level is
   * bound to `LoggingModuleOptions.defaultLevel` (default `'info'`).
   *
   * @returns The app-wide {@link ApplicationLogger} instance.
   *
   * @see ApplicationLogger
   */
  public createApplicationLogger(): ApplicationLogger {
    const level = this.options.defaultLevel ?? APP_DEFAULT
    const child = this.root.child({}, { level })
    return new ApplicationLogger(child)
  }
}
