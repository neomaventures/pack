import { Inject, type InjectionToken } from "@nestjs/common"

import { ConfigService } from "./config.service"

export * from "./config.module"
export * from "./config.service"

/**
 * Decorator for injecting the ConfigService into your services and controllers.
 * Provides type-safe access to environment variables with automatic naming conversion.
 *
 * @example
 * // Basic usage
 * @Injectable()
 * export class DatabaseService {
 *   constructor(
 *     @InjectConfig()
 *     private config: TypedConfig<{ databaseUrl: string }>
 *   ) {}
 * }
 *
 * @example
 * // With TypeScript interface for full type safety
 * interface AppConfig {
 *   databaseUrl: string
 *   apiKey: string
 *   port: string
 * }
 *
 * constructor(
 *   @InjectConfig()
 *   private config: TypedConfig<AppConfig>
 * ) {
 *   // Access with full IntelliSense
 *   const url = this.config.databaseUrl  // reads from DATABASE_URL
 *   const key = this.config.apiKey       // reads from API_KEY
 *   const port = this.config.port        // reads from PORT
 * }
 *
 * @returns Decorator that injects the ConfigService
 */
export const InjectConfig = (): PropertyDecorator & ParameterDecorator =>
  Inject(ConfigService as unknown as InjectionToken)

// Additional exports as you build your package:
// export * from "./decorators/your-decorator.decorator"
// export * from "./guards/your-guard.guard"
// export * from "./interfaces/your-interface.interface"
