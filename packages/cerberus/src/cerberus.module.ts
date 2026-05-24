import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common"

import { ConfigurableModuleClass } from "./cerberus.module-definition"
import { MultipartMiddleware } from "./middlewares/multipart.middleware"

/**
 * File storage module for NestJS applications.
 *
 * Provides S3-compatible file upload, entity persistence, and download
 * URL generation via an interceptor/decorator pattern.
 *
 * @requires TypeOrmModule must be configured in your application.
 *
 * @example Static configuration
 * ```typescript
 * CerberusModule.forRoot({
 *   endpoint: "http://localhost:9000",
 *   region: "us-east-1",
 *   bucket: "uploads",
 *   accessKeyId: process.env.S3_ACCESS_KEY_ID,
 *   secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
 *   entity: Upload,
 * })
 * ```
 *
 * @example Async configuration via DI
 * ```typescript
 * CerberusModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     endpoint: config.get("S3_ENDPOINT"),
 *     region: config.get("S3_REGION"),
 *     bucket: config.get("S3_BUCKET"),
 *     accessKeyId: config.get("S3_ACCESS_KEY_ID"),
 *     secretAccessKey: config.get("S3_SECRET_ACCESS_KEY"),
 *     entity: Upload,
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Module({})
export class CerberusModule
  extends ConfigurableModuleClass
  implements NestModule
{
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MultipartMiddleware).forRoutes("*")
  }
}
