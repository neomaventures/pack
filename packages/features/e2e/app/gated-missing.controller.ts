import { Feature } from "@neoma/features"
import { Controller, Get } from "@nestjs/common"

@Controller("gated-missing")
@Feature("MISSING_FEATURE")
export class GatedMissingController {
  @Get("handler-also-missing")
  @Feature("ALSO_MISSING")
  public handlerAlsoMissing(): string {
    return "gated-missing-handler-also-missing"
  }
}
