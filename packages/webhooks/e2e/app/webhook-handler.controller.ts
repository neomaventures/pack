import { WebhookHandler, WebhookSignatureGuard } from "@neomaventures/webhooks"
import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"

/**
 * Demo controller for testing @WebhookHandler() dedup in e2e specs.
 * Uses both guard and handler decorator to mimic real application usage.
 */
@Controller("webhooks/handled")
export class WebhookHandlerController {
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookSignatureGuard)
  @WebhookHandler("resend")
  public handleWebhook(@Body() payload: any): { handled: true; type: string } {
    return { handled: true, type: payload.type }
  }

  @Post("error")
  @UseGuards(WebhookSignatureGuard)
  @WebhookHandler("resend")
  public handleWebhookWithError(@Query("status") status = "500"): never {
    const statusCode = parseInt(status, 10)
    throw new HttpException("handler exploded", statusCode)
  }
}
