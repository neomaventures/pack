import { type ResolverContext } from "@neoma/route-model-binding"
import { HttpStatus, type INestApplication } from "@nestjs/common"
import { managedCustomAppInstance, setupCustomApp } from "fixtures/app/custom"
import { sqlInjectionAttempts } from "fixtures/database/sql-injection"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import request from "supertest"
import { type App } from "supertest/types"
import { DataSource, type FindOptionsWhere } from "typeorm"

describe("Custom Default Resolver", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()

  // Deleted entities to test soft-deletion handling
  // within the custom default resolver, these ensure that
  // the custom resolver is being used instead of the default
  // behavior which would return these entities.
  const deletedUser = userEntity.entity({ deletedAt: new Date() })
  const deletedPost = postEntity.entity({ deletedAt: new Date() })
  const nonExistentId = crypto.randomUUID()

  // An example custom resolver that makes use of all parameters available to it;
  // id, name (of the param), and the full request object:
  //
  // In this contrived example, we use the name to determine which param to use,
  // 1. If name isn't "user" or "post", it throws an error.
  // 2. If name is "user", it uses req.params.user to get the id
  // 3. If name is "post", it uses the id param directly as normal.
  //
  // This allows us to test that the id, name and req parameters are correctly
  // passed to the resolver function.
  const defaultResolver = ({
    id,
    name,
    req,
  }: ResolverContext): FindOptionsWhere<any> => {
    if (name !== "user" && name !== "post") {
      throw new Error(`Unexpected param name: ${name}`)
    }

    return {
      id: name === "user" ? req.params.user : id,
      deletedAt: null,
    }
  }

  let app: INestApplication<App>
  beforeEach(async () => {
    await setupCustomApp({ defaultResolver })
    app = managedCustomAppInstance()

    const ds = app.get<DataSource>(DataSource)
    await ds
      .getRepository(User)
      .save([userEntity.entity(), user, userEntity.entity(), deletedUser])

    await ds
      .getRepository(Post)
      .save([post, postEntity.entity(), postEntity.entity(), deletedPost])
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
