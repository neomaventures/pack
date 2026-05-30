import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

const { CREATED, FOUND, OK } = HttpStatus

const sampleFileName = `${faker.hacker.ingverb().toLowerCase().replace(/\s+/g, "-")}.txt`
const sampleFileContent = faker.hacker.phrase()
const sampleFileBuffer = Buffer.from(sampleFileContent)

const appModules: [string, string][] = [
  ["forRoot", "e2e/app/app.module.ts#AppModule"],
  ["forRootAsync", "e2e/app/app.async.module.ts#AsyncAppModule"],
]

appModules.forEach(([name, modulePath]) => {
  describe(`GET /uploads/:id (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance(modulePath)
    })

    describe("When a file has been uploaded", () => {
      let id: string
      beforeEach(async () => {
        ;({
          body: { id },
        } = await request(app.getHttpServer())
          .post("/uploads")
          .attach("file", sampleFileBuffer, sampleFileName)
          .expect(CREATED))
      })

      it(`should respond with HTTP ${FOUND} redirect and a pre-signed url`, async () => {
        const {
          headers: { location },
        } = await request(app.getHttpServer())
          .get(`/uploads/${id}`)
          .expect(FOUND)
          .expect("Location", /X-Amz-Signature/)

        await request(location).get("").expect(OK).expect(sampleFileContent)
      })
    })
  })
})
