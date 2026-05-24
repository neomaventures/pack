import "./index"

class TestError extends Error {
  public constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message)
  }
}

describe("toThrowMatching", () => {
  it("should pass when function throws the expected error class", () => {
    expect(() => {
      throw new TestError("ERR")
    }).toThrowMatching(TestError)
  })

  it("should fail when function throws a different error class", () => {
    expect(() => {
      expect(() => {
        throw new Error("wrong")
      }).toThrowMatching(TestError)
    }).toThrow(/Expected.*TestError.*got.*Error/)
  })

  it("should fail when function does not throw", () => {
    expect(() => {
      expect(() => {}).toThrowMatching(TestError)
    }).toThrow(/did not throw/)
  })

  it("should pass when properties match", () => {
    expect(() => {
      throw new TestError("ERR_CODE")
    }).toThrowMatching(TestError, { code: "ERR_CODE" })
  })

  it("should fail when properties do not match", () => {
    expect(() => {
      expect(() => {
        throw new TestError("ACTUAL")
      }).toThrowMatching(TestError, { code: "EXPECTED" })
    }).toThrow(/code/)
  })

  it("should reject non-function subjects with a clear error", () => {
    expect(() => {
      expect(new TestError("ERR")).toThrowMatching(TestError)
    }).toThrow(/toThrowMatching requires a function/)
  })
})

describe("toMatchError", () => {
  it("should pass when error matches the expected class", () => {
    const error = new TestError("ERR")
    expect(error).toMatchError(TestError)
  })

  it("should pass when error matches class and properties", () => {
    const error = new TestError("ERR_CODE")
    expect(error).toMatchError(TestError, { code: "ERR_CODE" })
  })

  it("should fail when error is not the expected class", () => {
    expect(() => {
      expect(new Error("wrong")).toMatchError(TestError)
    }).toThrow(/Expected.*TestError.*got.*Error/)
  })

  it("should reject function subjects with a clear error", () => {
    expect(() => {
      expect(() => {
        throw new TestError("ERR")
      }).toMatchError(TestError)
    }).toThrow(/toMatchError requires an error instance.*received a function/)
  })
})
