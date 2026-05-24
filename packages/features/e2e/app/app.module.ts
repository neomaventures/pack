import { FeaturesModule } from "@neoma/features"
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

@Module({
  imports: [
    FeaturesModule.forRoot({
      flags: {
        ENABLED_FEATURE: true,
        DISABLED_FEATURE: false,
        DOCUMENT_AI_SUMMARY: true,
      },
      resolve: () => ({
        DYNAMIC_FEATURE: true,
        DYNAMIC_DISABLED: false,
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
export class AppModule {}
