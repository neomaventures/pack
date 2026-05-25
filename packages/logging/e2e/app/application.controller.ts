import { ApplicationLoggerService } from "@neoma/logging"
import { Controller, Get, HttpCode } from "@nestjs/common"

@Controller()
export class ApplicationController {
  public constructor(public logger: ApplicationLoggerService) {}

  @Get("/status")
  @HttpCode(204)
  public getStatus(): void {}
}
