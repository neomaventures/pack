import { ForbiddenException } from "@nestjs/common"

import { FEATURE_KEY, Feature } from "./feature.decorator"

describe("Feature", () => {
  describe("Given @Feature is called with a flag only", () => {
    @Feature("CONTROLLER_FLAG")
    class ControllerOnly {}

    class HandlerOnly {
      @Feature("HANDLER_FLAG")
      public method(): void {}
    }

    @Feature("CONTROLLER_FLAG")
    class ControllerAndHandler {
      @Feature("HANDLER_FLAG")
      public method(): void {}
    }

    it("Then controller-level metadata carries only the flag", () => {
      expect(Reflect.getMetadata(FEATURE_KEY, ControllerOnly)).toEqual({
        flag: "CONTROLLER_FLAG",
      })
      expect(
        Reflect.getMetadata(FEATURE_KEY, ControllerOnly),
      ).not.toHaveProperty("onDeny")
    })

    it("Then handler-level metadata carries only the flag", () => {
      const handler = HandlerOnly.prototype.method
      expect(Reflect.getMetadata(FEATURE_KEY, handler)).toEqual({
        flag: "HANDLER_FLAG",
      })
      expect(Reflect.getMetadata(FEATURE_KEY, handler)).not.toHaveProperty(
        "onDeny",
      )
    })

    it("Then handler-level overrides controller-level with its own flag", () => {
      const handler = ControllerAndHandler.prototype.method
      expect(Reflect.getMetadata(FEATURE_KEY, ControllerAndHandler)).toEqual({
        flag: "CONTROLLER_FLAG",
      })
      expect(Reflect.getMetadata(FEATURE_KEY, handler)).toEqual({
        flag: "HANDLER_FLAG",
      })
    })
  })

  describe("Given @Feature is called with a flag and an onDeny option", () => {
    const controllerOnDeny = (): ForbiddenException => new ForbiddenException()
    const handlerOnDeny = (): ForbiddenException => new ForbiddenException()

    @Feature("CONTROLLER_FLAG", { onDeny: controllerOnDeny })
    class ControllerOnly {}

    class HandlerOnly {
      @Feature("HANDLER_FLAG", { onDeny: handlerOnDeny })
      public method(): void {}
    }

    @Feature("CONTROLLER_FLAG", { onDeny: controllerOnDeny })
    class ControllerAndHandler {
      @Feature("HANDLER_FLAG", { onDeny: handlerOnDeny })
      public method(): void {}
    }

    it("Then controller-level metadata carries flag and onDeny", () => {
      expect(Reflect.getMetadata(FEATURE_KEY, ControllerOnly)).toEqual({
        flag: "CONTROLLER_FLAG",
        onDeny: controllerOnDeny,
      })
    })

    it("Then handler-level metadata carries flag and onDeny", () => {
      const handler = HandlerOnly.prototype.method
      expect(Reflect.getMetadata(FEATURE_KEY, handler)).toEqual({
        flag: "HANDLER_FLAG",
        onDeny: handlerOnDeny,
      })
    })

    it("Then handler-level fully overrides controller-level (its own flag and onDeny)", () => {
      const handler = ControllerAndHandler.prototype.method
      expect(Reflect.getMetadata(FEATURE_KEY, ControllerAndHandler)).toEqual({
        flag: "CONTROLLER_FLAG",
        onDeny: controllerOnDeny,
      })
      expect(Reflect.getMetadata(FEATURE_KEY, handler)).toEqual({
        flag: "HANDLER_FLAG",
        onDeny: handlerOnDeny,
      })
    })
  })
})
