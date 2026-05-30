import { Module } from "@nestjs/common"

import { RequestContextModule } from "@neomaventures/request-context"

import { EchoController } from "./echo.controller"
import { RequestReaderService } from "./request-reader.service"

@Module({
  imports: [RequestContextModule.forRoot()],
  controllers: [EchoController],
  providers: [RequestReaderService],
})
export class AppModule {}
