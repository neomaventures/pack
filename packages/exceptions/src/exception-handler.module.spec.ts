import { ExceptionHandlerModule } from "@neomaventures/exceptions"
import { LoggingModule } from "@neomaventures/logging"
import { Test } from "@nestjs/testing"

describe("ExceptionHandlerModule", () => {
  it("should compile the module", async () => {
    const module = await Test.createTestingModule({
      imports: [LoggingModule.forRoot(), ExceptionHandlerModule],
    }).compile()

    expect(module).toBeDefined()
    expect(module).toBeInstanceOf(Object)
  })
})
