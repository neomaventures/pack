import { HealthcheckModule } from "@neomaventures/healthcheck"
import { Module } from "@nestjs/common"

import { HealthController } from "./health.controller"

@Module({
  imports: [HealthcheckModule.forRoot()],
  controllers: [HealthController],
})
export class AppWithoutDbModule {}
