import { ExceptionHandlerModule } from "@neoma/exceptions"
import { LoggingModule } from "@neoma/logging"
import { RequestContextModule } from "@neoma/request-context"
import { Module } from "@nestjs/common"

import { AppController } from "./app.controller"

@Module({
  imports: [
    RequestContextModule.forRoot(),
    LoggingModule.forRoot(),
    ExceptionHandlerModule,
  ],
  controllers: [AppController],
})
export class ExceptionModule {}
