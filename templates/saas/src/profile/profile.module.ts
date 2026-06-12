import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { ProfileController } from "~profile/profile.controller"
import { Upload } from "~profile/upload.entity"

/**
 * Module for the profile page.
 *
 * Registers the {@link Upload} entity with TypeORM so the storage package
 * and `Account.avatar` relation can resolve it. Also registers the
 * {@link ProfileController} which renders the authenticated user's
 * profile view.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Upload])],
  controllers: [ProfileController],
})
export class ProfileModule {}
