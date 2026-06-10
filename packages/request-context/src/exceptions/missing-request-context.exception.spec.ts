import { MissingRequestContextError } from "./missing-request-context.exception"

describe("MissingRequestContextError", () => {
  let error: MissingRequestContextError

  beforeEach(() => {
    error = new MissingRequestContextError()
  })

  describe("Given a freshly constructed error", () => {
    it("should be an instance of Error", () => {
      expect(error).toBeInstanceOf(Error)
    })

    it("should be an instance of MissingRequestContextError", () => {
      expect(error).toBeInstanceOf(MissingRequestContextError)
    })

    it("should set name to MissingRequestContextError", () => {
      expect(error.name).toBe("MissingRequestContextError")
    })

    it("should reference forRoot() in the message so log scrapers can match it", () => {
      expect(error.message).toContain("forRoot()")
    })

    it("should reference RequestContextModule in the message", () => {
      expect(error.message).toContain("RequestContextModule")
    })
  })
})
