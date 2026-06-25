import { ExceptionHandlerModule } from "@neomaventures/exceptions"
import { LoggingModule } from "@neomaventures/logging"
import { Test } from "@nestjs/testing"

describe("ExceptionHandlerModule", () => {
  describe("forRoot({})", () => {
    it("should compile the module with empty options", async () => {
      const module = await Test.createTestingModule({
        imports: [LoggingModule.forRoot(), ExceptionHandlerModule.forRoot({})],
      }).compile()

      expect(module).toBeDefined()
    })
  })

  describe("forRoot({ errorTemplates })", () => {
    it("should compile the module with errorTemplates configured", async () => {
      const module = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot(),
          ExceptionHandlerModule.forRoot({
            errorTemplates: {
              default: "errors/generic",
              404: "errors/404",
              500: "errors/server",
            },
          }),
        ],
      }).compile()

      expect(module).toBeDefined()
    })
  })

  describe("forRootAsync({ useFactory })", () => {
    it("should compile the module with options resolved asynchronously", async () => {
      const module = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot(),
          ExceptionHandlerModule.forRootAsync({
            useFactory: () => ({
              errorTemplates: { default: "errors/generic" },
            }),
          }),
        ],
      }).compile()

      expect(module).toBeDefined()
    })
  })
})
