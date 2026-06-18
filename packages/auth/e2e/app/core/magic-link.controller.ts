import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { type Response } from "express"

import {
  Account,
  EmailDto,
  MagicLinkService,
  SessionService,
} from "@neomaventures/auth"

interface VerifyResponse {
  token: string
  account: Account
  isNewAccount: boolean
}

@Controller("magic-link")
@UsePipes(new ValidationPipe({ stopAtFirstError: true }))
export class MagicLinkController {
  public constructor(
    private readonly magicLinkService: MagicLinkService,
    private readonly sessionService: SessionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  public async create(@Body() { email }: EmailDto): Promise<void> {
    await this.magicLinkService.send(email)
  }

  @Get("verify")
  public async verify(
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VerifyResponse> {
    const { account, isNewAccount } = await this.magicLinkService.verify(token)

    const { token: sessionToken } = this.sessionService.create(res, account)

    return {
      token: sessionToken,
      account,
      isNewAccount,
    }
  }
}
