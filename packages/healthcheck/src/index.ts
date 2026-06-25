// Module & Configuration
export { HealthcheckModule } from "./healthcheck.module"
export { HEALTHCHECK_OPTIONS } from "./healthcheck.options"
export type { HealthcheckOptions } from "./healthcheck.options"
export { HEALTHCHECK_METADATA_KEY } from "./healthcheck.constants"

// Services
export { HealthService } from "./health.service"

// Decorators
export { HealthCheck } from "./healthcheck.decorator"
export { HealthStatus } from "./health-status.decorator"

// Interceptors
export { HealthcheckInterceptor } from "./healthcheck.interceptor"

// Probes
export type {
  ProbeConfig,
  HttpProbeConfig,
  CustomProbeConfig,
  ProbeResult,
} from "./probes/probe-config"

// Types
export type { HealthResult } from "./healthcheck.types"
