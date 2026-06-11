import { HttpStatus, type INestApplication } from "@nestjs/common"
import { managedAppInstance } from "fixtures/app"
import { sqlInjectionAttempts } from "fixtures/database/sql-injection"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { type App } from "supertest/types"
import { DataSource } from "typeorm"

import { factories } from "../test/factories"

describe("Route Model Binding", () => {
  const user = factories.user()
  const post = factories.post()
  const nonExistentId = crypto.randomUUID()

  let app: INestApplication<App>
  beforeEach(async () => {
    app = managedAppInstance()
    const ds = app.get<DataSource>(DataSource)

    await ds
      .getRepository(User)
      .save([factories.user(), user, factories.user(), factories.user()])

    await ds
      .getRepository(Post)
      .save([factories.post(), post, factories.post()])
  })

  describe("GET /users/:user/posts/:post", () => {
    describe(`Given a user exists with the id ${user.id} and a post exists with the id ${post.id}`, () => {
      describe(`When a request is made to /users/${user.id}/${post.id}`, () => {
        it(`it should respond with a ${HttpStatus.OK} and the user model with the id ${user.id} and post model with the id ${post.id}`, () => {
          return request(app.getHttpServer())
            .get(`/users/${user.id}/posts/${post.id}`)
            .expect(HttpStatus.OK)
            .expect({ user: { ...user }, post: { ...post } })
        })
      })

      describe(`When a request is made to /users/${user.id}/posts/${nonExistentId}`, () => {
        it(`should respond with a ${HttpStatus.NOT_FOUND}`, () => {
          return request(app.getHttpServer())
            .get(`/users/${user.id}/posts/${nonExistentId}`)
            .expect(HttpStatus.NOT_FOUND)
            .expect({
              message: `Could not find Post with id ${nonExistentId}`,
              error: "Not Found",
              statusCode: HttpStatus.NOT_FOUND,
            })
        })
      })

      describe(`When a request is made to /users/${nonExistentId}/post/${post.id}`, () => {
        it(`should respond with a ${HttpStatus.NOT_FOUND}`, () => {
          return request(app.getHttpServer())
            .get(`/users/${nonExistentId}/posts/${post.id}`)
            .expect(HttpStatus.NOT_FOUND)
            .expect({
              message: `Could not find User with id ${nonExistentId}`,
              error: "Not Found",
              statusCode: HttpStatus.NOT_FOUND,
            })
        })
      })

      describe("SQL Injection Protection", () => {
        sqlInjectionAttempts.forEach((attempt) => {
          describe(`When a malicious SQL injection attempt is made to /users/${encodeURIComponent(attempt)}/posts/${post.id}`, () => {
            it(`should safely handle the attempt and return ${HttpStatus.NOT_FOUND}`, async () => {
              // First verify we have users in the database
              const userCount = await app
                .get<DataSource>(DataSource)
                .getRepository(User)
                .count()

              expect(userCount).toBeGreaterThan(0)

              await request(app.getHttpServer())
                .get(`/users/${encodeURIComponent(attempt)}/posts/${post.id}`)
                .expect(HttpStatus.NOT_FOUND)
                .expect({
                  message: `Could not find User with id ${attempt}`,
                  error: "Not Found",
                  statusCode: HttpStatus.NOT_FOUND,
                })

              // Verify the users table still exists and has the same data
              const userCountAfter = await app
                .get<DataSource>(DataSource)
                .getRepository(User)
                .count()

              expect(userCountAfter).toBe(userCount)
            })
          })

          describe(`When a malicious SQL injection attempt is made to /users/${user.id}/posts/${encodeURIComponent(attempt)}`, () => {
            it(`should handle SQL injection attempts in post parameter`, async () => {
              const postCount = await app
                .get<DataSource>(DataSource)
                .getRepository(Post)
                .count()

              expect(postCount).toBeGreaterThan(0)

              await request(app.getHttpServer())
                .get(`/users/${user.id}/posts/${encodeURIComponent(attempt)}`)
                .expect(HttpStatus.NOT_FOUND)
                .expect({
                  message: `Could not find Post with id ${attempt}`,
                  error: "Not Found",
                  statusCode: HttpStatus.NOT_FOUND,
                })

              // Verify the posts table is intact
              const postCountAfter = await app
                .get<DataSource>(DataSource)
                .getRepository(Post)
                .count()

              expect(postCountAfter).toBe(postCount)
            })
          })
        })
      })
    })
  })
})
