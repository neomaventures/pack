import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { DataSource } from "typeorm"

import { factories } from "../test/factories"

describe("Scope Accessor — Allowed", () => {
  const user = factories.user()
  const post = factories.post()

  let app: Awaited<ReturnType<typeof managedAppInstance>>
  beforeEach(async () => {
    app = await managedAppInstance(
      "e2e/app/scope-allow.module.ts#ScopeAllowModule",
    )
    const ds = app.get<DataSource>(DataSource)
    await ds.getRepository(User).save([user])
    await ds.getRepository(Post).save([post])
  })

  describe("GET /users/:user/posts/:post", () => {
    describe("Given a user and post exist", () => {
      describe("When the scope accessor returns true", () => {
        it(`should respond with ${HttpStatus.OK} and the resolved models`, () => {
          return request(app.getHttpServer())
            .get(`/users/${user.id}/posts/${post.id}`)
            .expect(HttpStatus.OK)
            .expect({ user: { ...user }, post: { ...post } })
        })
      })
    })
  })
})
