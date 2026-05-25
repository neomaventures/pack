import { LoggingModule } from "@neoma/logging"
import { Module } from "@nestjs/common"

import { ApplicationController } from "./application.controller"

@Module({
  imports: [LoggingModule.forRoot()],
  controllers: [ApplicationController],
})
export class ApplicationModule {}
