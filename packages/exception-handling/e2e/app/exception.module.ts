import { ExceptionHandlerModule } from "@neoma/exception-handling"
import { Module } from "@nestjs/common"

import { AppController } from "./app.controller"

@Module({
  imports: [ExceptionHandlerModule],
  controllers: [AppController],
})
export class ExceptionModule {}
