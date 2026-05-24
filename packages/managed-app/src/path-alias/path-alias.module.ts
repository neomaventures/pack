import { Module } from "@nestjs/common"

import {
  CONTROLLER_MESSAGE,
  MessageController,
} from "~/controllers/message.controller"

@Module({
  controllers: [MessageController],
  providers: [
    {
      provide: CONTROLLER_MESSAGE,
      useValue:
        "Hello from src/path-alias/path-alias.module.ts#PathAliasModule",
    },
  ],
})
export class PathAliasModule {}
