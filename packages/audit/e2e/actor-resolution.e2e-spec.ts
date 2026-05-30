import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"
import { DataSource } from "typeorm"

import { Widget } from "./app/widgets/widget.entity"

describe("@CreatedBy / @UpdatedBy", () => {
  describe("Given no resolveActor is defined", () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>
    beforeEach(async () => {
      app = await managedAppInstance(
        "e2e/app/no-resolver-app.module.ts#NoResolverAppModule",
      )
    })

    it("should set createdBy and updatedBy to 'system' on create", async () => {
      const { body } = await request(app.getHttpServer())
        .post("/widgets")
        .send({ name: faker.commerce.productName() })
        .expect(HttpStatus.CREATED)

      const stored = await app
        .get(DataSource)
        .getRepository(Widget)
        .findOneByOrFail({ id: body.id })

      expect(stored).toMatchObject({
        createdBy: "system",
        updatedBy: "system",
      })
    })

    it("should not change createdBy or updatedBy on update", async () => {
      const server = app.getHttpServer()

      const { body: created } = await request(server)
        .post("/widgets")
        .send({ name: faker.commerce.productName() })
        .expect(HttpStatus.CREATED)

      await request(server)
        .put(`/widgets/${created.id}`)
        .send({ name: faker.commerce.productName() })
        .expect(HttpStatus.OK)

      const stored = await app
        .get(DataSource)
        .getRepository(Widget)
        .findOneByOrFail({ id: created.id })

      expect(stored).toMatchObject({
        createdBy: "system",
        updatedBy: "system",
      })
    })
  })

  const resolverModules = [
    {
      label: "forRoot",
      path: "e2e/app/value-resolver-app.module.ts#ValueResolverAppModule",
    },
    {
      label: "forRootAsync",
      path: "e2e/app/value-resolver-async-app.module.ts#ValueResolverAsyncAppModule",
    },
  ]

  resolverModules.forEach(({ label, path }) => {
    describe(`Given resolveActor is defined (${label})`, () => {
      let app: Awaited<ReturnType<typeof managedAppInstance>>
      beforeEach(async () => {
        app = await managedAppInstance(path)
      })

      it("should set createdBy and updatedBy to the resolved actor on create", async () => {
        const actor = `principal:${faker.string.uuid()}`

        const { body } = await request(app.getHttpServer())
          .post("/widgets")
          .set("x-actor", actor)
          .send({ name: faker.commerce.productName() })
          .expect(HttpStatus.CREATED)

        const stored = await app
          .get(DataSource)
          .getRepository(Widget)
          .findOneByOrFail({ id: body.id })

        expect(stored).toMatchObject({
          createdBy: actor,
          updatedBy: actor,
        })
      })

      it("should update updatedBy to the new actor and not change createdBy", async () => {
        const server = app.getHttpServer()
        const createActor = `principal:${faker.string.uuid()}`
        const updateActor = `principal:${faker.string.uuid()}`

        const { body: created } = await request(server)
          .post("/widgets")
          .set("x-actor", createActor)
          .send({ name: faker.commerce.productName() })
          .expect(HttpStatus.CREATED)

        await request(server)
          .put(`/widgets/${created.id}`)
          .set("x-actor", updateActor)
          .send({ name: faker.commerce.productName() })
          .expect(HttpStatus.OK)

        const stored = await app
          .get(DataSource)
          .getRepository(Widget)
          .findOneByOrFail({ id: created.id })

        expect(stored).toMatchObject({
          createdBy: createActor,
          updatedBy: updateActor,
        })
      })

      it("should fall back to 'system' when resolver returns null", async () => {
        const { body } = await request(app.getHttpServer())
          .post("/widgets")
          .send({ name: faker.commerce.productName() })
          .expect(HttpStatus.CREATED)

        const stored = await app
          .get(DataSource)
          .getRepository(Widget)
          .findOneByOrFail({ id: body.id })

        expect(stored).toMatchObject({
          createdBy: "system",
          updatedBy: "system",
        })
      })
    })
  })

  describe("Given a custom defaultActor is defined", () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>
    beforeEach(async () => {
      app = await managedAppInstance(
        "e2e/app/custom-default-app.module.ts#CustomDefaultAppModule",
      )
    })

    it("should use the custom default when resolver returns null", async () => {
      const { body } = await request(app.getHttpServer())
        .post("/widgets")
        .send({ name: faker.commerce.productName() })
        .expect(HttpStatus.CREATED)

      const stored = await app
        .get(DataSource)
        .getRepository(Widget)
        .findOneByOrFail({ id: body.id })

      expect(stored).toMatchObject({
        createdBy: "custom-default",
        updatedBy: "custom-default",
      })
    })
  })
})
