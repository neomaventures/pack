import { MockLoggerService } from "./index"

describe("MockLoggerService", () => {
  const expectedMethods = [
    "debug",
    "error",
    "fatal",
    "log",
    "trace",
    "verbose",
    "warn",
    "setLogLevels",
  ] as const

  it.each(expectedMethods)("should have %s as a jest.fn()", (method) => {
    const logger = new MockLoggerService()
    expect(jest.isMockFunction(logger[method])).toBe(true)
  })

  it("should implement LoggerService", () => {
    const logger = new MockLoggerService()
    // Core LoggerService methods exist and are callable
    logger.log("test")
    logger.error("test")
    logger.warn("test")
    logger.debug("test")
    logger.verbose("test")
    logger.fatal("test")
    logger.trace("test")
    logger.setLogLevels(["log", "error"])

    expect(logger.log).toHaveBeenCalledWith("test")
    expect(logger.setLogLevels).toHaveBeenCalledWith(["log", "error"])
  })
})
