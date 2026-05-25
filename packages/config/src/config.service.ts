import { Inject, Injectable, Optional } from "@nestjs/common"

/**
 * Options for configuring the ConfigModule.
 *
 * @property loadEnv - If true, loads environment variables from .env files into process.env
 * @property strict - If true, throws an error when accessing undefined environment variables
 * @property coerce - If true, attempts to coerce environment variable types
 */
export type ConfigOptions = {
  loadEnv: boolean
  strict: boolean
  coerce: boolean
}

/**
 * Injection token for providing ConfigOptions to the ConfigModule.
 */
export const CONFIG_OPTIONS = Symbol("CONFIG_OPTIONS")

/**
 * Checks if a string represents a "clean" number that should be coerced.
 * Excludes decimal leading zeros and empty strings to preserve user intent.
 *
 * @param str - The string value to check for number coercion eligibility
 * @returns True if the string should be coerced to a number, false otherwise
 *
 * @example
 * isCleanNumber("123")     // true - clean integer
 * isCleanNumber("1.23")    // true - clean float
 * isCleanNumber("0x1F")    // true - valid hex
 * isCleanNumber("007")     // false - decimal leading zero
 * isCleanNumber("")        // false - empty string
 * isCleanNumber(" 123 ")   // true - whitespace allowed
 */
function isCleanNumber(str: string | undefined): boolean {
  // No undefined, null, or empty strings
  if (!str) return false

  // Block decimal leading zeros (but allow hex/octal/binary)
  if (/^0[0-9]/.test(str.trim())) return false

  // Must be parseable
  const num = Number(str)
  return !isNaN(num)
}

/**
 * Service that provides type-safe access to environment variables through dependency injection.
 * Automatically converts property names from camelCase to SCREAMING_SNAKE_CASE when accessing environment variables.
 *
 * @example
 * // Basic usage
 * constructor(
 *   @InjectConfig()
 *   private config: TypedConfig<{ apiKey: string }>
 * ) {
 *   console.log(this.config.apiKey) // Reads from process.env.API_KEY
 * }
 *
 * @example
 * // Supports multiple naming conventions
 * this.config.databaseUrl  // DATABASE_URL (camelCase)
 * this.config.databaseURL  // DATABASE_URL (mixed case)
 * this.config.awsS3Bucket  // AWS_S3_BUCKET (acronyms)
 *
 * @example
 * // With TypeScript interfaces for full type safety
 * interface AppConfig {
 *   port: string
 *   databaseUrl: string
 *   redisHost?: string // Optional
 * }
 *
 * constructor(
 *   @InjectConfig()
 *   private config: TypedConfig<AppConfig>
 * ) {
 *   // Full IntelliSense and type checking
 *   const port = this.config.port
 *   const redis = this.config.redisHost || 'localhost'
 * }
 *
 * @example
 * // With coerce enabled for automatic type conversion
 * interface ServerConfig {
 *   port: number        // "3000" → 3000
 *   debug: boolean      // "true" → true
 *   timeout: number     // "30" → 30
 *   apiKey: string      // Stays as string
 * }
 *
 * // Enable coerce in module
 * ConfigModule.forRoot({ coerce: true })
 *
 * constructor(
 *   @InjectConfig()
 *   private config: TypedConfig<ServerConfig>
 * ) {
 *   const port = this.config.port      // number: 3000
 *   const debug = this.config.debug    // boolean: true
 *   const timeout = this.config.timeout // number: 30
 * }
 *
 * @remarks
 * Supports destructuring: const { apiKey, apiUrl } = this.config
 *
 * @throws {Error} When strict mode is enabled and accessing an undefined environment variable
 */
@Injectable()
export class ConfigService<T extends Record<string, any>> {
  public constructor(
    @Optional()
    @Inject(CONFIG_OPTIONS)
    options: Partial<ConfigOptions> = {},
  ) {
    const toEnvKey = (prop: string): string =>
      prop
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, "$1_$2")
        .toUpperCase()

    const ignoredProperties = new Set([
      "then",
      "toJSON",
      // NestJS lifecycle hooks — the framework probes these via property access
      // during module init/shutdown. They must not trigger strict mode.
      "onModuleInit",
      "onModuleDestroy",
      "onApplicationBootstrap",
      "onApplicationShutdown",
      "beforeApplicationShutdown",
    ])

    return new Proxy(this as unknown as T, {
      get: (
        _target,
        prop: string | symbol,
      ): string | boolean | number | undefined | null => {
        if (typeof prop === "symbol" || ignoredProperties.has(prop)) {
          return undefined
        }

        const envKey = toEnvKey(prop)
        const value = process.env[envKey] ?? process.env[envKey.toLowerCase()]

        if (value === undefined && options.strict) {
          throw new Error(
            `Strict mode error when accessing configuration property '${prop}'. ${envKey} is not defined on process.env`,
          )
        }

        if (options.coerce) {
          if (value === "null") {
            return null
          }

          if (value === "undefined") {
            return undefined
          }

          if (value === "true") {
            return true
          }

          if (value === "false") {
            return false
          }

          // Only parse numbers that don't have decimal leading zeros or are empty
          if (isCleanNumber(value)) {
            return Number(value)
          }
        }

        return value
      },
      has: (_target, prop: string | symbol): boolean => {
        if (typeof prop === "symbol" || ignoredProperties.has(prop)) {
          return false
        }

        const envKey = toEnvKey(prop)
        const value = process.env[envKey] ?? process.env[envKey.toLowerCase()]

        return value !== undefined
      },
    })
  }
}

/**
 * Type helper that combines ConfigService with your configuration interface for full type safety.
 * Makes all properties readonly to prevent accidental modification.
 *
 * @example
 * type Config = TypedConfig<{ apiKey: string; debugMode?: string }>
 * // Results in a type where apiKey is required and debugMode is optional
 *
 * @example
 * // With coerce enabled, use appropriate TypeScript types
 * type ServerConfig = TypedConfig<{
 *   port: number;     // Will be coerced from string
 *   debug: boolean;   // Will be coerced from "true"/"false"
 *   name: string;     // Stays as string
 * }>
 */
export type TypedConfig<T extends Record<string, any>> = ConfigService<T> &
  Readonly<T>
