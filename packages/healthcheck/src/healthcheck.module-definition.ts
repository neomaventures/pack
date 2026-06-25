import { ConfigurableModuleBuilder } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"

import { HealthService } from "./health.service"
import { HealthcheckInterceptor } from "./healthcheck.interceptor"
import {
  HEALTHCHECK_OPTIONS,
  type HealthcheckOptions,
} from "./healthcheck.options"
import { type ProbeConfig } from "./probes/probe-config"
import { ProbeRunnerService } from "./probes/probe-runner.service"

const HEALTHCHECK_PROVIDERS = [HealthService, ProbeRunnerService]

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<HealthcheckOptions>({
  optionsInjectionToken: HEALTHCHECK_OPTIONS,
})
  .setClassMethodName("forRoot")
  .setExtras({ probes: [] as ProbeConfig[] }, (definition) => ({
    ...definition,
    providers: [
      ...(definition.providers ?? []),
      ...HEALTHCHECK_PROVIDERS,
      { provide: APP_INTERCEPTOR, useClass: HealthcheckInterceptor },
    ],
    exports: [...(definition.exports ?? []), HealthService],
  }))
  .build()
