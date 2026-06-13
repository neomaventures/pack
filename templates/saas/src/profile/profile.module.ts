import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { Account } from "~auth/account.entity"
import { ProfileController } from "~profile/profile.controller"
import { ProfileService } from "~profile/profile.service"
import { Upload } from "~profile/upload.entity"

/**
 * Module for the profile page and profile-scoped assets.
 *
 * Registers the {@link Upload} and {@link Account} entities with
 * TypeORM so the storage package, `Account.avatar` relation, and
 * {@link ProfileService} can resolve them. Also registers the
 * {@link ProfileController} which renders the authenticated user's
 * profile view and serves the avatar endpoint.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Account, Upload])],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
