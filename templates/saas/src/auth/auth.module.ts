import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { Account } from "~auth/account.entity"
import { AuthController } from "~auth/auth.controller"

/**
 * SaaS template auth module — owns the authentication ceremony routes.
 *
 * Named `SaasAuthModule` to avoid collision with `AuthModule` from
 * `@neomaventures/auth`, which provides the underlying services
 * (MagicLinkService, SessionService) as global providers.
 *
 * Registers the {@link Account} entity with TypeORM so that
 * `MagicLinkService` can resolve the entity metadata via `DataSource`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Account])],
  controllers: [AuthController],
})
export class SaasAuthModule {}
