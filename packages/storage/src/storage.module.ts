import {
  type DynamicModule,
  MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common"

import { MultipartMiddleware } from "./middlewares/multipart.middleware"
import {
  type FEATURE_ASYNC_OPTIONS_TYPE,
  type FEATURE_OPTIONS_TYPE,
  FeatureConfigurableModuleClass,
  RootConfigurableModuleClass,
} from "./storage.module-definition"

/**
 * File storage module for NestJS applications.
 *
 * Provides S3-compatible file upload, entity persistence, and download
 * URL generation via an interceptor/decorator pattern.
 *
 * The connection (`S3Client`) and the multipart middleware are configured
 * once via {@link StorageModule.forRoot}. Each feature that wants to
 * upload to or serve files from a specific bucket then imports
 * {@link StorageModule.forFeature} in its own module, which provides a
 * feature-scoped `StorageService`, `UploadInterceptor`, and
 * `TemporaryLinkInterceptor` bound to that bucket.
 *
 * @requires TypeOrmModule must be configured in your application.
 *
 * @example Root configuration
 * ```typescript
 * StorageModule.forRoot({
 *   endpoint: "http://localhost:9000",
 *   region: "us-east-1",
 *   accessKeyId: process.env.S3_ACCESS_KEY_ID,
 *   secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
 *   entity: Upload,
 *   defaults: { maxFileSize: 5 * 1024 * 1024 },
 * })
 * ```
 *
 * @example Feature configuration (per consuming module)
 * ```typescript
 * @Module({
 *   imports: [StorageModule.forFeature({ bucket: "avatars" })],
 *   controllers: [AvatarsController],
 * })
 * export class AvatarsModule {}
 * ```
 *
 * @example Async configuration via DI
 * ```typescript
 * StorageModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     endpoint: config.get("S3_ENDPOINT"),
 *     region: config.get("S3_REGION"),
 *     accessKeyId: config.get("S3_ACCESS_KEY_ID"),
 *     secretAccessKey: config.get("S3_SECRET_ACCESS_KEY"),
 *     entity: Upload,
 *   }),
 *   inject: [ConfigService],
 * }),
 * StorageModule.forFeatureAsync({
 *   useFactory: (config: ConfigService) => ({ bucket: config.get("S3_BUCKET") }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Module({})
export class StorageModule
  extends RootConfigurableModuleClass
  implements NestModule
{
  /**
   * Registers a per-feature storage scope (bucket + per-feature limit
   * overrides). Returns a `DynamicModule` that the consuming feature
   * module imports. See {@link StorageFeatureModule}.
   */
  public static forFeature(
    options: typeof FEATURE_OPTIONS_TYPE,
  ): DynamicModule {
    return StorageFeatureModule.forFeature(options)
  }

  /**
   * Async variant of {@link StorageModule.forFeature} for config-driven
   * bucket resolution.
   */
  public static forFeatureAsync(
    options: typeof FEATURE_ASYNC_OPTIONS_TYPE,
  ): DynamicModule {
    return StorageFeatureModule.forFeatureAsync(options)
  }

  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MultipartMiddleware).forRoutes("*")
  }
}

/**
 * Per-feature storage module. Importing this in a feature module binds a
 * `StorageService`, `UploadInterceptor`, and `TemporaryLinkInterceptor`
 * to the feature's bucket and per-feature overrides for limits.
 *
 * Each importing module gets its own provider instances (standard
 * NestJS module-DI per-instancing) so two features that both upload
 * (e.g. `avatars`, `documents`) get distinct buckets without any
 * scope-shenanigans (`Scope.TRANSIENT`, `ModuleRef.resolve`, etc).
 *
 * Consumers do not reference `StorageFeatureModule` directly — they use
 * `StorageModule.forFeature(...)` / `StorageModule.forFeatureAsync(...)`,
 * which return `DynamicModule` references to this class.
 */
@Module({})
export class StorageFeatureModule extends FeatureConfigurableModuleClass {}
