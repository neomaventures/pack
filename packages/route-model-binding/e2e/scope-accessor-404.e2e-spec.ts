import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { DataSource } from "typeorm"

describe("Scope Accessor — Deny 404", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()

  describe("When deny is explicitly set to 404", () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>
    beforeEach(async () => {
      app = await managedAppInstance(
        "e2e/app/scope-deny-404.module.ts#ScopeDeny404Module",
      )
      const ds = app.get<DataSource>(DataSource)
      await ds.getRepository(User).save([user])
      await ds.getRepository(Post).save([post])
    })

    it(`should respond with ${HttpStatus.NOT_FOUND}`, () => {
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

  describe("When deny is omitted (defaults to 404)", () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>
    beforeEach(async () => {
      app = await managedAppInstance(
        "e2e/app/scope-deny-default.module.ts#ScopeDenyDefaultModule",
      )
      const ds = app.get<DataSource>(DataSource)
      await ds.getRepository(User).save([user])
      await ds.getRepository(Post).save([post])
    })

    it(`should respond with ${HttpStatus.NOT_FOUND}`, () => {
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
