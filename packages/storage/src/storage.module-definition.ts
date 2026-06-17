import { ConfigurableModuleBuilder } from "@nestjs/common"
import { EventEmitterModule } from "@nestjs/event-emitter"

import { TemporaryLinkInterceptor } from "./interceptors/temporary-link.interceptor"
import { UploadInterceptor } from "./interceptors/upload.interceptor"
import { MultipartMiddleware } from "./middlewares/multipart.middleware"
import { S3ClientProvider } from "./providers/s3-client.provider"
import { DefaultKeyResolver } from "./resolvers/default-key.resolver"
import { StorageService } from "./services/storage.service"
import { UlidIdGenerator } from "./services/ulid-id-generator.service"
import { type StorageOptions, STORAGE_OPTIONS } from "./storage.options"

const STORAGE_PROVIDERS = [
  MultipartMiddleware,
  StorageService,
  TemporaryLinkInterceptor,
  UploadInterceptor,
  UlidIdGenerator,
  DefaultKeyResolver,
  S3ClientProvider,
]

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<StorageOptions>({
  optionsInjectionToken: STORAGE_OPTIONS,
})
  .setClassMethodName("forRoot")
  .setExtras({}, (definition) => ({
    ...definition,
    // global: true — interceptor needs DI resolution in consumer controller modules
    global: true,
    imports: [...(definition.imports ?? []), EventEmitterModule.forRoot()],
    providers: [...(definition.providers ?? []), ...STORAGE_PROVIDERS],
    exports: [
      ...(definition.exports ?? []),
      ...STORAGE_PROVIDERS,
      STORAGE_OPTIONS,
    ],
  }))
  .build()
