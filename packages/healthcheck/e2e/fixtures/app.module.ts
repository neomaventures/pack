import { HealthcheckModule } from "@neomaventures/healthcheck"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { HealthController } from "./health.controller"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: [],
      synchronize: true,
    }),
    HealthcheckModule.forRoot(),
  ],
  controllers: [HealthController],
})
export class AppModule {}
