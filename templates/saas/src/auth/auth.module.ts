import { Module } from "@nestjs/common"

import { AuthController } from "~auth/auth.controller"

/**
 * SaaS template auth module — owns the authentication ceremony routes.
 *
 * Named `SaasAuthModule` to avoid collision with `AuthModule` from
 * `@neomaventures/auth`, which provides the underlying services
 * (MagicLinkService, SessionService) as global providers.
 */
@Module({
  controllers: [AuthController],
})
export class SaasAuthModule {}
