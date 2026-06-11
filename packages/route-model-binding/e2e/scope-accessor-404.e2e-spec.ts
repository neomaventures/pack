import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { DataSource } from "typeorm"

import { factories } from "../test/factories"

describe("Scope Accessor — Deny 404", () => {
  const user = factories.user()
  const post = factories.post()

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
