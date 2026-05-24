import { Feature } from "@neoma/features"
import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common"

@Controller()
export class AppController {
  @Get("status")
  @HttpCode(HttpStatus.NO_CONTENT)
  public status(): void {
    // Health check endpoint — no @Feature, always accessible
  }

  @Get("enabled")
  @Feature("ENABLED_FEATURE")
  public enabled(): string {
    return "enabled"
  }

  @Get("disabled")
  @Feature("DISABLED_FEATURE")
  public disabled(): string {
    return "disabled"
  }

  @Get("missing")
  @Feature("MISSING_FEATURE")
  public missing(): string {
    return "missing"
  }
}
