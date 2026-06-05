import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { DataSource } from "typeorm"

describe("Scope Accessor — Multi-param", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()

  describe("Given a user and post exist", () => {
    describe("When the accessor allows users but denies posts", () => {
      let app: Awaited<ReturnType<typeof managedAppInstance>>
      beforeEach(async () => {
        app = await managedAppInstance(
          "e2e/app/scope-deny-post.module.ts#ScopeDenyPostModule",
        )
        const ds = app.get<DataSource>(DataSource)
        await ds.getRepository(User).save([user])
        await ds.getRepository(Post).save([post])
      })

      it("should deny access with 404 for the post", () => {
        return request(app.getHttpServer())
          .get(`/users/${user.id}/posts/${post.id}`)
          .expect(HttpStatus.NOT_FOUND)
          .expect({
            message: `Could not find Post with id ${post.id}`,
            error: "Not Found",
            statusCode: HttpStatus.NOT_FOUND,
          })
      })
    })

    describe("When the accessor denies the first entity (user)", () => {
      let app: Awaited<ReturnType<typeof managedAppInstance>>
      beforeEach(async () => {
        app = await managedAppInstance(
          "e2e/app/scope-deny-404.module.ts#ScopeDeny404Module",
        )
        const ds = app.get<DataSource>(DataSource)
        await ds.getRepository(User).save([user])
        await ds.getRepository(Post).save([post])
      })

      it("should short-circuit and deny access with 404 for the user", () => {
        return request(app.getHttpServer())
          .get(`/users/${user.id}/posts/${post.id}`)
          .expect(HttpStatus.NOT_FOUND)
          .expect({
            message: `Could not find User with id ${user.id}`,
            error: "Not Found",
            statusCode: HttpStatus.NOT_FOUND,
          })
      })
    })
  })
})
