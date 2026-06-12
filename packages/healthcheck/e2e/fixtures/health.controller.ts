import {
  HealthCheck,
  type HealthResult,
  HealthStatus,
} from "@neomaventures/healthcheck"
import { Controller, Get } from "@nestjs/common"

@Controller()
export class HealthController {
  @Get("api/health")
  @HealthCheck()
  public health(@HealthStatus() status: HealthResult): HealthResult {
    return status
  }
}
