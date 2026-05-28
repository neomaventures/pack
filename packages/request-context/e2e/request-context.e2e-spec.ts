import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

const { CREATED } = HttpStatus

describe("getRequest()", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance("e2e/app/app.module.ts#AppModule")
  })

  describe("Given a request is made with a body", () => {
    describe("When a default-scoped provider reads the request", () => {
      it("Then the response echoes what the provider read", async () => {
        const marker = faker.string.uuid()

        await request(app.getHttpServer())
          .post("/echo")
          .send({ marker })
          .expect(CREATED)
          .expect(({ body }) => expect(body).toEqual({ body: { marker } }))
      })
    })
  })

  describe("Given two concurrent requests with different bodies", () => {
    describe("When each handler's default-scoped provider reads its request", () => {
      it("Then each response carries only its own body — never the other's", async () => {
        const [a, b] = await Promise.all([
          request(app.getHttpServer()).post("/echo/slow").send({ marker: "A" }),
          request(app.getHttpServer()).post("/echo/slow").send({ marker: "B" }),
        ])

        expect(a.status).toBe(CREATED)
        expect(b.status).toBe(CREATED)
        expect(a.body).toEqual({ marker: "A" })
        expect(b.body).toEqual({ marker: "B" })
      })
    })
  })
})
