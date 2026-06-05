import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { DataSource } from "typeorm"

describe("Scope Accessor — Allowed", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()

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
