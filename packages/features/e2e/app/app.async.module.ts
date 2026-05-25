import { FeaturesModule, type FeaturesModuleOptions } from "@neoma/features"
import { Module } from "@nestjs/common"

import { AppController } from "./app.controller"
import { DocumentsController } from "./documents.controller"
import { DocumentsService } from "./documents.service"
import { GatedDynamicController } from "./gated-dynamic.controller"
import { GatedEnabledController } from "./gated-enabled.controller"
import { GatedMissingController } from "./gated-missing.controller"
import { GatedController } from "./gated.controller"
import {
  OnDenyClassOverrideController,
  OnDenyController,
} from "./on-deny.controller"
import { UserFeaturesModule } from "./user-features.module"
import { UserFeaturesService } from "./user-features.service"

@Module({
  imports: [
    FeaturesModule.forRootAsync({
      imports: [UserFeaturesModule],
      inject: [UserFeaturesService],
      useFactory: (users: UserFeaturesService): FeaturesModuleOptions => ({
        flags: {
          ENABLED_FEATURE: true,
          DISABLED_FEATURE: false,
        },
        resolve: (req) => users.featuresFor(req),
      }),
    }),
  ],
  controllers: [
    AppController,
    DocumentsController,
    GatedController,
    GatedDynamicController,
    GatedEnabledController,
    GatedMissingController,
    OnDenyController,
    OnDenyClassOverrideController,
  ],
  providers: [DocumentsService],
})
export class AsyncAppModule {}
