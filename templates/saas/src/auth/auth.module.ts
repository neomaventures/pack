import { Account, OAuthToken } from "@neomaventures/auth"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { AccountAvatarKeyResolver } from "~auth/account-avatar-key.resolver"
import { AuthController } from "~auth/auth.controller"
import { ProfileController } from "~auth/profile.controller"
import { Upload } from "~auth/upload.entity"
import { ProfileModule } from "~profile/profile.module"

/**
 * SaaS template auth module — owns the authentication ceremony routes
 * and the profile page / avatar asset endpoints.
 *
 * Named `SaasAuthModule` to avoid collision with `AuthModule` from
 * `@neomaventures/auth`, which provides the underlying services
 * (MagicLinkService, SessionService) as global providers.
 *
 * Registers the {@link Account} and `OAuthToken` entities from auth (so
 * the auth services can resolve them via `DataSource.getRepository`),
 * plus the consumer-owned {@link Upload}. {@link ProfileModule} owns the
 * `Profile` entity and `ProfileService`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Account, OAuthToken, Upload]),
    ProfileModule,
  ],
  controllers: [AuthController, ProfileController],
  providers: [AccountAvatarKeyResolver],
})
export class SaasAuthModule {}
