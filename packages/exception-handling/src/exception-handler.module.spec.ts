import { ExceptionHandlerModule } from "@neoma/exception-handling"
import { Test } from "@nestjs/testing"

describe("ExceptionHandlerModule", () => {
  it("should compile the module", async () => {
    const module = await Test.createTestingModule({
      imports: [ExceptionHandlerModule],
    }).compile()

    expect(module).toBeDefined()
    expect(module).toBeInstanceOf(Object)
  })
})
