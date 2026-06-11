import { type ResolverContext } from "@neomaventures/route-model-binding"
import { HttpStatus, type INestApplication } from "@nestjs/common"
import { managedCustomAppInstance, setupCustomApp } from "fixtures/app/custom"
import { sqlInjectionAttempts } from "fixtures/database/sql-injection"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { type App } from "supertest/types"
import { DataSource, type FindOptionsWhere } from "typeorm"

import { factories } from "../test/factories"

describe("Param Resolver", () => {
  const user = factories.user()
  const post = factories.post()

  // Deleted entities to test soft-deletion handling
  // within the custom default resolver, these ensure that
  // the custom resolver is being used instead of the default
  // behavior which would return these entities.
  const deletedUser = factories.user({ deletedAt: new Date() })
  const deletedPost = factories.post({ deletedAt: new Date() })
  const nonExistentId = crypto.randomUUID()

  // An example custom resolver that only expects to be called for the user
  // parameter (because we've provided a custom post parameter resolver):
  //
  // In this contrived example we throw an error if the parameter name is
  // anything other than "user".
  //
  // This allows us to test that this custom default provider is only called
  // for the user parameter.
  const defaultResolver = ({
    id,
    name,
  }: ResolverContext): FindOptionsWhere<any> => {
    if (name !== "user") {
      throw new Error(`Unexpected param name: ${name}`)
    }

    return {
      id,
      deletedAt: null,
    }
  }

  /**
   * An example parameter resolver that only expects to be called for the
   * post parameter.
   *
   * In this contrived example we throw an error if the parameter name is
   * anything other than "post".
   *
   * This allows us to test that this parameter resolver is only called for
   * the post parameter.
   */
  const postResolver = ({
    name,
    req,
  }: ResolverContext): FindOptionsWhere<any> => {
    if (name !== "post") {
      throw new Error(`Unexpected param name: ${name}`)
    }

    return {
      id: req.params.post,
      deletedAt: null,
    }
  }

  let app: INestApplication<App>
  beforeEach(async () => {
    await setupCustomApp({
      defaultResolver,
      paramResolvers: { post: postResolver },
    })

    app = managedCustomAppInstance()

    const ds = app.get<DataSource>(DataSource)
    await ds
      .getRepository(User)
      .save([factories.user(), user, factories.user(), deletedUser])

    await ds
      .getRepository(Post)
      .save([post, factories.post(), factories.post(), deletedPost])
  })

  describe("GET /users/:user/posts/:post", () => {
    describe(`Given a user exists with the id ${user.id} and a post exits with the id ${post.id}`, () => {
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

    describe(`Given a user with the id ${deletedUser.id} and a post with the id ${deletedPost.id} have been deleted`, () => {
      describe(`When a request is made to /users/${deletedUser.id}/posts/${post.id}`, () => {
        it(`should respond with a ${HttpStatus.NOT_FOUND}`, () => {
          return request(app.getHttpServer())
            .get(`/users/${deletedUser.id}/posts/${post.id}`)
            .expect(HttpStatus.NOT_FOUND)
            .expect({
              message: `Could not find User with id ${deletedUser.id}`,
              error: "Not Found",
              statusCode: HttpStatus.NOT_FOUND,
            })
        })
      })

      describe(`When a request is made to /users/${user.id}/posts/${deletedPost.id}`, () => {
        it(`should respond with a ${HttpStatus.NOT_FOUND}`, () => {
          return request(app.getHttpServer())
            .get(`/users/${user.id}/posts/${deletedPost.id}`)
            .expect(HttpStatus.NOT_FOUND)
            .expect({
              message: `Could not find Post with id ${deletedPost.id}`,
              error: "Not Found",
              statusCode: HttpStatus.NOT_FOUND,
            })
        })
      })
    })
  })
})
