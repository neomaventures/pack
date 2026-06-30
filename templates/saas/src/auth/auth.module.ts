import { Account, OAuthToken } from "@neomaventures/auth"
import { ConfigService, type TypedConfig } from "@neomaventures/config"
import { MailboxModule, type MailboxOptions } from "@neomaventures/mailbox"
import { StorageModule } from "@neomaventures/storage"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { AccountAvatarKeyResolver } from "~auth/account-avatar-key.resolver"
import { AuthController } from "~auth/auth.controller"
import { GmailTokenAccessor } from "~auth/gmail-token-accessor"
import { ProfileController } from "~auth/profile.controller"
import { Profile } from "~auth/profile.entity"
import { ProfileService } from "~auth/profile.service"
import { Upload } from "~auth/upload.entity"

/**
 * Narrow view of `AppConfig` — just the storage bucket name — used by the
 * `StorageModule.forFeatureAsync` factory below.
 */
interface AuthStorageConfig {
  /** Bucket name avatar uploads are written to. */
  avatarBucket: string
}

/**
 * Narrow view of `AppConfig` — just the Gmail API base URL override —
 * used by the `MailboxModule.forRootAsync` factory below. Optional in
 * production (mailbox defaults to `https://gmail.googleapis.com`); set in
 * spec / e2e / ui-spec env files to point at mockserver.
 */
interface AuthMailboxConfig {
  /** Override for Gmail's API base URL. Used in tests to point at a mocked endpoint. */
  gmailApiBaseUrl: string
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
 * plus the consumer-owned {@link Upload} and {@link Profile} entities and
 * the {@link ProfileService} provider.
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
    TypeOrmModule.forFeature([Account, OAuthToken, Upload, Profile]),
    StorageModule.forFeatureAsync({
      useFactory: (config: TypedConfig<AuthStorageConfig>) => ({
        bucket: config.avatarBucket,
      }),
      inject: [ConfigService],
    }),
    MailboxModule.forRootAsync({
      tokenAccessor: GmailTokenAccessor,
      useFactory: (
        config: TypedConfig<AuthMailboxConfig>,
      ): Omit<MailboxOptions, "tokenAccessor"> => ({
        ...(config.gmailApiBaseUrl && {
          gmailApiBaseUrl: config.gmailApiBaseUrl,
        }),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, ProfileController],
  providers: [AccountAvatarKeyResolver, GmailTokenAccessor, ProfileService],
})
export class SaasAuthModule {}
