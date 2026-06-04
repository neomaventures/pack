import { HttpStatus, type INestApplication } from "@nestjs/common"
import {
  SpyAccessor,
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

describe("Scope Accessor — Multi-param", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()

  let app: INestApplication<App>
  beforeEach(async () => {
    SpyAccessor.calls = []
    await setupScopedApp({
      defaultResolver: ({ id }) => ({ id }),
      scope: { accessor: SpyAccessor },
    })
    app = managedScopedAppInstance()

    const ds = app.get<DataSource>(DataSource)
    await ds.getRepository(User).save([user])
    await ds.getRepository(Post).save([post])
  })

  describe("GET /users/:user/posts/:post", () => {
    describe(`Given a user exists with the id ${user.id} and a post exists with the id ${post.id}`, () => {
      describe("When the scope accessor is configured on a multi-param route", () => {
        it("should call canAccess once per resolved entity", async () => {
          await request(app.getHttpServer())
            .get(`/users/${user.id}/posts/${post.id}`)
            .expect(HttpStatus.OK)

          expect(SpyAccessor.calls).toHaveLength(2)
        })

        it("should pass the correct context for the first entity (user)", async () => {
          await request(app.getHttpServer())
            .get(`/users/${user.id}/posts/${post.id}`)
            .expect(HttpStatus.OK)

          expect(SpyAccessor.calls[0]).toMatchObject({
            entity: { ...user },
            name: "user",
            id: user.id,
          })
          expect(SpyAccessor.calls[0].req).toBeDefined()
        })

        it("should pass the correct context for the second entity (post)", async () => {
          await request(app.getHttpServer())
            .get(`/users/${user.id}/posts/${post.id}`)
            .expect(HttpStatus.OK)

          expect(SpyAccessor.calls[1]).toMatchObject({
            entity: { ...post },
            name: "post",
            id: post.id,
          })
          expect(SpyAccessor.calls[1].req).toBeDefined()
        })
      })
    })
  })
})
