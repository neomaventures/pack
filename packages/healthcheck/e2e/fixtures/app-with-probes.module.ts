import {
  HealthcheckModule,
  type HealthcheckOptions,
} from "@neomaventures/healthcheck"
import { Module } from "@nestjs/common"

import { HealthController } from "./health.controller"

/**
 * E2E app module that opts into upstream probes. Probe URLs are read from
 * env vars (`STORAGE_HEALTH_URL`, `MAIL_HEALTH_URL`) populated by the spec
 * before the Nest module is compiled. `forRootAsync` defers the env lookup
 * until the testing module is built, avoiding the SWC import-hoist trap
 * that would otherwise capture undefined values.
 */
@Module({
  imports: [
    HealthcheckModule.forRootAsync({
      useFactory: (): HealthcheckOptions => ({
        probes: {
          storage: { url: process.env.STORAGE_HEALTH_URL! },
          mail: { url: process.env.MAIL_HEALTH_URL! },
        },
      }),
    }),
  ],
  controllers: [HealthController],
})
export class AppWithProbesModule {}
