import { HttpStatus, type INestApplication } from "@nestjs/common"
import {
  AllowAllAccessor,
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

describe("Scope Accessor — Allowed", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()

  let app: INestApplication<App>
  beforeEach(async () => {
    await setupScopedApp({
      defaultResolver: ({ id }) => ({ id }),
      scope: { accessor: AllowAllAccessor },
    })
    app = managedScopedAppInstance()

    const ds = app.get<DataSource>(DataSource)
    await ds.getRepository(User).save([user])
    await ds.getRepository(Post).save([post])
  })

  describe("GET /users/:user/posts/:post", () => {
    describe(`Given a user exists with the id ${user.id} and a post exists with the id ${post.id}`, () => {
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
