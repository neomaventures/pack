import { SessionService } from "@neomaventures/auth"
import { Controller, HttpCode, HttpStatus, Post, Res } from "@nestjs/common"
import { type Response } from "express"

@Controller("logout")
export class LogoutController {
  public constructor(private readonly sessionService: SessionService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  public logout(@Res({ passthrough: true }) res: Response): void {
    this.sessionService.clear(res)
  }
}
