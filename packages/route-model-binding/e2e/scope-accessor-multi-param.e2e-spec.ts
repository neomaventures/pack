import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"
import { SpyAccessor } from "src/accessors/spy.accessor"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { DataSource } from "typeorm"

describe("Scope Accessor — Multi-param", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()

  let app: Awaited<ReturnType<typeof managedAppInstance>>
  beforeEach(async () => {
    SpyAccessor.calls = []
    app = await managedAppInstance(
      "e2e/app/scope-multi-param.module.ts#ScopeMultiParamModule",
    )
    const ds = app.get<DataSource>(DataSource)
    await ds.getRepository(User).save([user])
    await ds.getRepository(Post).save([post])
  })

  describe("GET /users/:user/posts/:post", () => {
    describe("Given a user and post exist", () => {
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
