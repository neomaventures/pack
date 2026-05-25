import { RouteModel } from "@neoma/route-model-binding"
import { Controller, Get } from "@nestjs/common"

import { Post } from "./post.entity"
import { User } from "./user.entity"

@Controller()
export class AppController {
  @Get("/users/:user/posts/:post")
  public getUser(
    @RouteModel("user") user: User,
    @RouteModel("post") post: Post,
  ): { user: User; post: Post } {
    return { user, post }
  }
}
