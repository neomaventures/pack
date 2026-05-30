import { Feature } from "@neomaventures/features"
import { Controller, Get } from "@nestjs/common"

@Controller("gated-enabled")
@Feature("ENABLED_FEATURE")
export class GatedEnabledController {
  @Get("handler-missing")
  @Feature("MISSING_FEATURE")
  public handlerMissing(): string {
    return "gated-enabled-handler-missing"
  }
}
