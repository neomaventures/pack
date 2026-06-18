import { Account, OAuthToken } from "@neomaventures/auth"
import { ConfigService, type TypedConfig } from "@neomaventures/config"
import { StorageModule } from "@neomaventures/storage"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { AccountAvatarKeyResolver } from "~auth/account-avatar-key.resolver"
import { AuthController } from "~auth/auth.controller"
import { ProfileController } from "~auth/profile.controller"
import { Upload } from "~auth/upload.entity"
import { ProfileModule } from "~profile/profile.module"

/**
 * Narrow view of `AppConfig` — just the storage bucket name — used by the
 * `StorageModule.forFeatureAsync` factory below.
 */
interface AuthStorageConfig {
  /** Bucket name uploads are written to. */
  s3Bucket: string
}

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
 *
 * `StorageModule.forFeatureAsync` is imported here — not at the
 * application root — because the feature scope provides
 * `StorageService` and `TemporaryLinkInterceptor` only to the importing
 * module. `ProfileController` uses `@TemporaryLink()` and
 * {@link AccountAvatarKeyResolver} injects `StorageService`, so both
 * consumers live inside this module and need the feature-scoped
 * providers. Connection config (`StorageModule.forRootAsync`) stays at
 * the application root.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Account, OAuthToken, Upload]),
    StorageModule.forFeatureAsync({
      useFactory: (config: TypedConfig<AuthStorageConfig>) => ({
        bucket: config.s3Bucket,
      }),
      inject: [ConfigService],
    }),
    ProfileModule,
  ],
  controllers: [AuthController, ProfileController],
  providers: [AccountAvatarKeyResolver],
})
export class SaasAuthModule {}
