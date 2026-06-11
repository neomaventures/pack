import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { DataSource } from "typeorm"

import { factories } from "../test/factories"

describe("Scope Accessor — Multi-param", () => {
  const user = factories.user()
  const post = factories.post()

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

      it("should deny access with 404 for the user", () => {
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
