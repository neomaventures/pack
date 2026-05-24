import { ConfigurableModuleBuilder } from "@nestjs/common"

import {
  FEATURES_OPTIONS,
  type FeaturesModuleOptions,
} from "./features.options"

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<FeaturesModuleOptions>({
  optionsInjectionToken: FEATURES_OPTIONS,
})
  .setClassMethodName("forRoot")
  // The module defaults to global because the feature guard is registered
  // via APP_GUARD and must be able to resolve FEATURES_OPTIONS from any
  // module in the application without requiring each module to re-import
  // FeaturesModule.
  .setExtras({}, (definition) => ({
    ...definition,
    global: true,
  }))
  .build()
