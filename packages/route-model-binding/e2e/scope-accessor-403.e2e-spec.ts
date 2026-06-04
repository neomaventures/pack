import { HttpStatus, type INestApplication } from "@nestjs/common"
import {
  DenyAllAccessor,
  managedScopedAppInstance,
  setupScopedApp,
} from "fixtures/app/scoped"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { type App } from "supertest/types"
import { DataSource } from "typeorm"

describe("Scope Accessor — Deny 403", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()

  let app: INestApplication<App>
  beforeEach(async () => {
    await setupScopedApp({
      defaultResolver: ({ id }) => ({ id }),
      scope: { accessor: DenyAllAccessor, deny: 403 },
    })
    app = managedScopedAppInstance()

    const ds = app.get<DataSource>(DataSource)
    await ds.getRepository(User).save([user])
    await ds.getRepository(Post).save([post])
  })

  describe("GET /users/:user/posts/:post", () => {
    describe(`Given a user exists with the id ${user.id} and a post exists with the id ${post.id}`, () => {
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
