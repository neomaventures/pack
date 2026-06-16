import { Controller, HttpCode, HttpStatus, Post, Res } from "@nestjs/common"
import { type Response } from "express"

import { SessionService } from "@neomaventures/auth"

@Controller("logout")
export class LogoutController {
  public constructor(private readonly sessionService: SessionService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  public logout(@Res({ passthrough: true }) res: Response): void {
    this.sessionService.clear(res)
  }
}
