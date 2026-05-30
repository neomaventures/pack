import { FeaturesModule } from "@neomaventures/features"
import { Module } from "@nestjs/common"
import type { Request } from "express"

import { AppController } from "./app.controller"
import { ResolverController } from "./resolver.controller"

@Module({
  imports: [
    FeaturesModule.forRoot({
      flags: {
        ENABLED_FEATURE: true,
        DISABLED_FEATURE: false,
      },
      resolve: (req: Request) => {
        const header = req.headers?.["x-features"]
        const resolved: Record<string, boolean> = {
          // Intentionally report ENABLED_FEATURE as false to exercise the
          // "static true wins over resolver false" rule.
          ENABLED_FEATURE: false,
          DISABLED_FEATURE: false,
        }
        if (typeof header === "string" && header === "RESOLVER_ENABLED") {
          resolved.RESOLVER_ENABLED = true
        }
        return resolved
      },
    }),
  ],
  controllers: [AppController, ResolverController],
})
export class UnionAppModule {}
