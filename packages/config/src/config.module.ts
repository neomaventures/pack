import { DynamicModule, Module } from "@nestjs/common"
import * as dotenv from "dotenv"

import { CONFIG_OPTIONS, ConfigOptions, ConfigService } from "./config.service"

/**
 * Module that provides type-safe access to environment variables through dependency injection.
 * Automatically converts between camelCase properties and SCREAMING_SNAKE_CASE environment variables.
 *
 * Must be registered via `forRoot()` which makes the module global.
 *
 * @example
 * // Register once at the app root — available everywhere
 * imports: [ConfigModule.forRoot()]
 *
 * @example
 * // With strict mode - throws on undefined env vars
 * imports: [ConfigModule.forRoot({ strict: true })]
 *
 * @example
 * // With coerce enabled - automatic type conversion
 * imports: [ConfigModule.forRoot({ coerce: true })]
 */
@Module({})
export class ConfigModule {
  public static forRoot({
    loadEnv = false,
    strict = false,
    coerce = false,
  }: Partial<ConfigOptions> = {}): DynamicModule {
    if (loadEnv) {
      dotenv.config({
        path: [
          `.env.${process.env.NODE_ENV}.local`,
          ".env.local",
          `.env.${process.env.NODE_ENV}`,
          ".env",
        ],
        quiet: true,
      })
    }

    return {
      global: true,
      module: ConfigModule,
      providers: [
        ConfigService,
        { provide: CONFIG_OPTIONS, useValue: { loadEnv, strict, coerce } },
      ],
      exports: [ConfigService],
    }
  }
}
