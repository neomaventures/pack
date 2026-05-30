import { ExceptionHandlerModule } from "@neomaventures/exceptions"
import { LoggingModule } from "@neomaventures/logging"
import { RequestContextModule } from "@neomaventures/request-context"
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
