import { ConfigurableModuleBuilder } from "@nestjs/common"
import { EventEmitterModule } from "@nestjs/event-emitter"

import { TemporaryLinkInterceptor } from "./interceptors/temporary-link.interceptor"
import { UploadInterceptor } from "./interceptors/upload.interceptor"
import { MultipartMiddleware } from "./middlewares/multipart.middleware"
import { S3ClientProvider } from "./providers/s3-client.provider"
import { DefaultKeyResolver } from "./resolvers/default-key.resolver"
import { StorageService } from "./services/storage.service"
import { UlidIdGenerator } from "./services/ulid-id-generator.service"
import {
  type ResolvedFeatureStorageOptions,
  type ResolvedStorageRootOptions,
  type StorageFeatureOptions,
  type StorageRootOptions,
  DEFAULT_LINK_EXPIRES_IN,
  RESOLVED_FEATURE_STORAGE_OPTIONS,
  RESOLVED_STORAGE_OPTIONS,
  STORAGE_FEATURE_OPTIONS,
  STORAGE_OPTIONS,
} from "./storage.options"

// Root-scope providers: connection, repository binding, multipart middleware,
// resolvers, and id generators. Each is a singleton shared across feature
// modules so the S3 connection pool isn't fragmented.
const ROOT_PROVIDERS = [
  MultipartMiddleware,
  S3ClientProvider,
  DefaultKeyResolver,
  UlidIdGenerator,
]

// Feature-scope providers: each importing module gets its own instance bound
// to that feature's resolved options.
const FEATURE_PROVIDERS = [
  StorageService,
  UploadInterceptor,
  TemporaryLinkInterceptor,
]

export const {
  ConfigurableModuleClass: RootConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<StorageRootOptions>({
  optionsInjectionToken: STORAGE_OPTIONS,
})
  .setClassMethodName("forRoot")
  .setExtras({}, (definition) => ({
    ...definition,
    // global: true — S3_CLIENT, STORAGE_OPTIONS, RESOLVED_STORAGE_OPTIONS, and
    // the multipart middleware/key resolver are connection-shared. Feature
    // modules pull these via DI without re-importing the root.
    global: true,
    imports: [...(definition.imports ?? []), EventEmitterModule.forRoot()],
    providers: [
      ...(definition.providers ?? []),
      ...ROOT_PROVIDERS,
      {
        provide: RESOLVED_STORAGE_OPTIONS,
        useFactory: (
          options: StorageRootOptions,
        ): ResolvedStorageRootOptions => ({
          ...options,
          forcePathStyle: options.forcePathStyle ?? true,
          defaults: options.defaults ?? {},
        }),
        inject: [STORAGE_OPTIONS],
      },
    ],
    exports: [
      ...(definition.exports ?? []),
      ...ROOT_PROVIDERS,
      STORAGE_OPTIONS,
      RESOLVED_STORAGE_OPTIONS,
    ],
  }))
  .build()

export const {
  ConfigurableModuleClass: FeatureConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: FEATURE_MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE: FEATURE_ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE: FEATURE_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<StorageFeatureOptions>({
  optionsInjectionToken: STORAGE_FEATURE_OPTIONS,
})
  .setClassMethodName("forFeature")
  .setExtras({}, (definition) => ({
    ...definition,
    // NOT global — each feature module imports its own forFeature and gets
    // distinct StorageService/interceptor instances bound to its bucket.
    providers: [
      ...(definition.providers ?? []),
      ...FEATURE_PROVIDERS,
      {
        provide: RESOLVED_FEATURE_STORAGE_OPTIONS,
        useFactory: (
          feature: StorageFeatureOptions,
          root: ResolvedStorageRootOptions,
        ): ResolvedFeatureStorageOptions => ({
          bucket: feature.bucket,
          maxFileSize: feature.maxFileSize ?? root.defaults.maxFileSize,
          allowedMimeTypes:
            feature.allowedMimeTypes ?? root.defaults.allowedMimeTypes,
          linkExpiresIn:
            feature.linkExpiresIn ??
            root.defaults.linkExpiresIn ??
            DEFAULT_LINK_EXPIRES_IN,
          linkCacheControl:
            feature.linkCacheControl ?? root.defaults.linkCacheControl,
        }),
        inject: [STORAGE_FEATURE_OPTIONS, RESOLVED_STORAGE_OPTIONS],
      },
    ],
    exports: [
      ...(definition.exports ?? []),
      ...FEATURE_PROVIDERS,
      STORAGE_FEATURE_OPTIONS,
      RESOLVED_FEATURE_STORAGE_OPTIONS,
    ],
  }))
  .build()
