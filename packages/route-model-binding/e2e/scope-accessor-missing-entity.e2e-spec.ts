import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

describe("Scope Accessor — Missing Entity", () => {
  const nonExistentUserId = crypto.randomUUID()
  const nonExistentPostId = crypto.randomUUID()

  describe("Given a scope accessor that denies all access", () => {
    describe("When deny is 404 and the entity does not exist", () => {
      let app: Awaited<ReturnType<typeof managedAppInstance>>

      beforeEach(async () => {
        app = await managedAppInstance(
          "e2e/app/scope-deny-404.module.ts#ScopeDeny404Module",
        )
      })

      it(`should respond with ${HttpStatus.NOT_FOUND}`, () => {
        return request(app.getHttpServer())
          .get(`/users/${nonExistentUserId}/posts/${nonExistentPostId}`)
          .expect(HttpStatus.NOT_FOUND)
          .expect((res: request.Response) => {
            expect(res.body).toMatchObject({
              error: "Not Found",
              statusCode: HttpStatus.NOT_FOUND,
            })
          })
      })
    })

    describe("When deny is 403 and the entity does not exist", () => {
      let app: Awaited<ReturnType<typeof managedAppInstance>>

      beforeEach(async () => {
        app = await managedAppInstance(
          "e2e/app/scope-deny-403.module.ts#ScopeDeny403Module",
        )
      })

      it(`should respond with ${HttpStatus.NOT_FOUND} and not ${HttpStatus.FORBIDDEN}`, () => {
        return request(app.getHttpServer())
          .get(`/users/${nonExistentUserId}/posts/${nonExistentPostId}`)
          .expect(HttpStatus.NOT_FOUND)
          .expect((res: request.Response) => {
            expect(res.body).toMatchObject({
              error: "Not Found",
              statusCode: HttpStatus.NOT_FOUND,
            })
          })
      })
    })
  })
})
