export {}

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Checks if a method threw a particular type of exception
       * and that the properties of the exception match the expected
       * exception.
       *
       * Note: This is a custom matcher that can be used in place of
       * jest's toThrow matcher if an error's properties are important.
       *
       * @example
       * function throwXenomorphError() {
       *    throw new XenomorphError("Xenomorph ate your face.")
       * }
       * expect(throwXenomorphError).toThrowEquals(new XenomorphError("Xenomorph ate your face.")) // Will pass
       * expect(throwXenomorphError).toThrowEquals(new XenomorphError("Xenomorphs like being petted.")) // Will fail
       * expect(throwXenomorphError).toThrowEquals(XenomorphError) // Will fail as properties are wrong - use jest's toThrow matcher
       *
       * @param exception The expected exception.
       */
      toThrowEquals(exception: any): R

      /**
       * Checks if an error is a particular type of exception
       * and that the properties of the exception match the expected
       * exception.
       *
       * @example
       * expect(new XenomorphError("Xenomorph ate your face.")).toThrowEquals(new XenomorphError("Xenomorph ate your face.")) // Will pass
       * expect(new XenomorphError("Xenomorph ate your face.")).toThrowEquals(new XenomorphError("Xenomorphs like being petted.")) // Will fail
       * expect(new XenomorphError("Xenomorph ate your face.")).toThrowEquals(XenomorphError) // Will fail as properties are wrong - use jest's toThrow matcher
       *
       * @param exception The expected exception.
       */
      toEqualError(expected: Error): R
    }
  }
}
