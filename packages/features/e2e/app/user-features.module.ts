import { Module } from "@nestjs/common"

import { UserFeaturesService } from "./user-features.service"

@Module({
  providers: [UserFeaturesService],
  exports: [UserFeaturesService],
})
export class UserFeaturesModule {}
