import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { DataSource } from "typeorm"

describe("Scope Accessor — Deny 403", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()

  let app: Awaited<ReturnType<typeof managedAppInstance>>
  beforeEach(async () => {
    app = await managedAppInstance(
      "e2e/app/scope-deny-403.module.ts#ScopeDeny403Module",
    )
    const ds = app.get<DataSource>(DataSource)
    await ds.getRepository(User).save([user])
    await ds.getRepository(Post).save([post])
  })

  describe("GET /users/:user/posts/:post", () => {
    describe("Given a user and post exist", () => {
      describe("When the scope accessor denies access with deny: 403", () => {
        it(`should respond with ${HttpStatus.FORBIDDEN}`, () => {
          return request(app.getHttpServer())
            .get(`/users/${user.id}/posts/${post.id}`)
            .expect(HttpStatus.FORBIDDEN)
            .expect({
              message: `Access denied to User with id ${user.id}`,
              error: "Forbidden",
              statusCode: HttpStatus.FORBIDDEN,
            })
        })
      })
    })
  })
})
