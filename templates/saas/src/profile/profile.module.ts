import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import { Profile } from "~profile/profile.entity"
import { ProfileService } from "~profile/profile.service"

/**
 * Owns the {@link Profile} entity and the {@link ProfileService} write
 * path. Imported by `SaasAuthModule` so the profile controller can inject
 * the service.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Profile])],
  providers: [ProfileService],
  exports: [ProfileService, TypeOrmModule],
})
export class ProfileModule {}
