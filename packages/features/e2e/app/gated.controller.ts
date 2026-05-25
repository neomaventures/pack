import { Feature } from "@neoma/features"
import { Controller, Get } from "@nestjs/common"

@Controller("gated")
@Feature("DISABLED_FEATURE")
export class GatedController {
  @Get()
  public index(): string {
    return "gated-index"
  }

  @Get("override")
  @Feature("ENABLED_FEATURE")
  public override(): string {
    return "gated-override"
  }
}
