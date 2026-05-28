import { ExceptionHandlerModule } from "@neoma/exception-handling"
import { LoggingModule } from "@neoma/logging"
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
