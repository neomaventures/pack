import { ConfigurableModuleBuilder } from "@nestjs/common"
import { EventEmitterModule } from "@nestjs/event-emitter"

import { type CerberusOptions, CERBERUS_OPTIONS } from "./cerberus.options"
import { TemporaryLinkInterceptor } from "./interceptors/temporary-link.interceptor"
import { UploadInterceptor } from "./interceptors/upload.interceptor"
import { MultipartMiddleware } from "./middlewares/multipart.middleware"
import { DefaultKeyResolver } from "./resolvers/default-key.resolver"
import { StorageService } from "./services/storage.service"
import { UlidIdGenerator } from "./services/ulid-id-generator.service"

const CERBERUS_PROVIDERS = [
  MultipartMiddleware,
  StorageService,
  TemporaryLinkInterceptor,
  UploadInterceptor,
  UlidIdGenerator,
  DefaultKeyResolver,
]

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<CerberusOptions>({
  optionsInjectionToken: CERBERUS_OPTIONS,
})
  .setClassMethodName("forRoot")
  .setExtras({}, (definition) => ({
    ...definition,
    // global: true — interceptor needs DI resolution in consumer controller modules
    global: true,
    imports: [...(definition.imports ?? []), EventEmitterModule.forRoot()],
    providers: [...(definition.providers ?? []), ...CERBERUS_PROVIDERS],
    exports: [
      ...(definition.exports ?? []),
      ...CERBERUS_PROVIDERS,
      CERBERUS_OPTIONS,
    ],
  }))
  .build()
