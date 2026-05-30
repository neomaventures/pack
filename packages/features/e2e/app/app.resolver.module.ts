import { FeaturesModule } from "@neomaventures/features"
import { Module } from "@nestjs/common"
import type { Request } from "express"

import { ResolverController } from "./resolver.controller"

@Module({
  imports: [
    FeaturesModule.forRoot({
      resolve: (req: Request): Record<string, boolean> => {
        const header = req.headers?.["x-features"]
        if (typeof header === "string" && header === "RESOLVER_ENABLED") {
          return { RESOLVER_ENABLED: true }
        }
        return {}
      },
    }),
  ],
  controllers: [ResolverController],
})
export class ResolverAppModule {}
