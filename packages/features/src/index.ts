// Module & Configuration
export { FeaturesModule } from "./features.module"
export type {
  FeatureOnDeny,
  FeatureOptions,
  FeatureResolver,
  FeaturesModuleOptions,
} from "./features.options"

// Services injected via DI
export { FeaturesService } from "./services/features.service"

// Decorators used in consumer controllers
export { Feature } from "./decorators/feature.decorator"
