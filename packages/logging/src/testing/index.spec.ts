import { type Logger } from "../interfaces/logger.interface"

import { MockLogger } from "./index"

describe("MockLogger", () => {
  const expectedMethods = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
  ] as const

  it.each(expectedMethods)("should have %s as a jest.fn()", (method) => {
    const logger = new MockLogger()
    expect(jest.isMockFunction(logger[method])).toBe(true)
  })

  it("should satisfy the Logger contract", () => {
    const logger: Logger = new MockLogger()

    logger.trace("entering handler", { route: "/foo" })
    logger.debug("diagnostic", { attempt: 1 })
    logger.info("user signed in", { userId: "abc" })
    logger.warn("retrying", { attempt: 2 })
    logger.error("charge failed", { err: new Error("boom") })
    logger.fatal("process exiting")

    const mock = logger as MockLogger
    expect(mock.trace).toHaveBeenCalledWith("entering handler", {
      route: "/foo",
    })
    expect(mock.debug).toHaveBeenCalledWith("diagnostic", { attempt: 1 })
    expect(mock.info).toHaveBeenCalledWith("user signed in", { userId: "abc" })
    expect(mock.warn).toHaveBeenCalledWith("retrying", { attempt: 2 })
    expect(mock.error).toHaveBeenCalledWith(
      "charge failed",
      expect.objectContaining({ err: expect.any(Error) }),
    )
    expect(mock.fatal).toHaveBeenCalledWith("process exiting")
  })
})
