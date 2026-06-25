import { ConfigurableModuleBuilder } from "@nestjs/common"

import { type ExceptionHandlerOptions } from "./exception-handler.options"

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<ExceptionHandlerOptions>()
  .setClassMethodName("forRoot")
  .build()
