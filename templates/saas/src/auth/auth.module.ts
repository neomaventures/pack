import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { AccountAvatarKeyResolver } from "~auth/account-avatar-key.resolver"
import { Account } from "~auth/account.entity"
import { AccountService } from "~auth/account.service"
import { AuthController } from "~auth/auth.controller"
import { OAuthToken } from "~auth/oauth-token.entity"
import { ProfileController } from "~auth/profile.controller"
import { Upload } from "~auth/upload.entity"

/**
 * SaaS template auth module — owns the authentication ceremony routes
 * and the account domain (profile page, avatar asset endpoints).
 *
 * Named `SaasAuthModule` to avoid collision with `AuthModule` from
 * `@neomaventures/auth`, which provides the underlying services
 * (MagicLinkService, SessionService) as global providers.
 *
 * Registers the {@link Account}, {@link OAuthToken}, and {@link Upload}
 * entities with TypeORM so that `MagicLinkService`, `GoogleAuthService`'s
 * relational token upsert, the `Account.avatar` relation, the storage
 * package's `UploadInterceptor`, and {@link AccountService} can resolve
 * them.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Account, OAuthToken, Upload])],
  controllers: [AuthController, ProfileController],
  providers: [AccountService, AccountAvatarKeyResolver],
})
export class SaasAuthModule {}
