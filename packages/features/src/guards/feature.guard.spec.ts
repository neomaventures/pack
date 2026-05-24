import {
  ConflictException,
  type ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { express } from "fixtures/express"
import { executionContext } from "fixtures/nestjs"

import { Feature } from "../decorators/feature.decorator"
import { type FeatureOnDeny } from "../features.options"
import { FeaturesService } from "../services/features.service"

import { FeatureGuard } from "./feature.guard"

async function resolveGuard(
  isEnabled: jest.Mock = jest.fn().mockResolvedValue(true),
): Promise<{ guard: FeatureGuard; isEnabled: jest.Mock }> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      FeatureGuard,
      { provide: FeaturesService, useValue: { isEnabled } },
    ],
  }).compile()

  const guard = await moduleRef.resolve(FeatureGuard)
  return { guard, isEnabled }
}

function ctxFor(
  controller: new (...args: any[]) => any,
  methodName: string,
  req = express.request(),
): ExecutionContext {
  const handler = controller.prototype[methodName] as () => void
  return executionContext(
    req,
    undefined,
    handler,
    controller,
  ) as ExecutionContext
}

// --- Test fixtures: real classes with real @Feature decorators. -----------

class Ungated {
  public method(): void {}
}

class HandlerX {
  @Feature("X")
  public method(): void {}
}

@Feature("CLASS_FLAG")
class ClassAndHandler {
  @Feature("HANDLER_FLAG")
  public method(): void {}
}

const forbidden = new ForbiddenException("denied by factory")
const onDenyForbidden: FeatureOnDeny = () => forbidden

class HandlerXWithOnDeny {
  @Feature("X", { onDeny: onDenyForbidden })
  public method(): void {}
}

@Feature("CLASS_FLAG", { onDeny: onDenyForbidden })
class ClassOnDenyHandlerPlain {
  @Feature("HANDLER_FLAG")
  public method(): void {}
}

@Feature("CLASS_FLAG")
class ClassPlainHandlerOnDeny {
  @Feature("HANDLER_FLAG", { onDeny: onDenyForbidden })
  public method(): void {}
}

@Feature("X", { onDeny: () => new ForbiddenException() })
class ClassAndHandlerOnDeny {
  @Feature("X", { onDeny: () => new ConflictException() })
  public method(): void {}
}

// --------------------------------------------------------------------------

describe("FeatureGuard", () => {
  describe("Given a route with no @Feature metadata", () => {
    describe("When canActivate is called", () => {
      it("Then it returns true without calling FeaturesService.isEnabled", async () => {
        const { guard, isEnabled } = await resolveGuard()
        await expect(
          guard.canActivate(ctxFor(Ungated, "method")),
        ).resolves.toBe(true)
        expect(isEnabled).not.toHaveBeenCalled()
      })
    })
  })

  describe("Given a handler with @Feature('X') metadata", () => {
    describe("When FeaturesService.isEnabled resolves true", () => {
      it("Then canActivate admits (returns true) and delegates with the handler flag", async () => {
        const isEnabled = jest.fn().mockResolvedValue(true)
        const { guard } = await resolveGuard(isEnabled)
        await expect(
          guard.canActivate(ctxFor(HandlerX, "method")),
        ).resolves.toBe(true)
        expect(isEnabled).toHaveBeenCalledWith("X")
      })
    })

    describe("When FeaturesService.isEnabled resolves false and no onDeny is set", () => {
      it("Then canActivate throws NotFoundException", async () => {
        const isEnabled = jest.fn().mockResolvedValue(false)
        const { guard } = await resolveGuard(isEnabled)
        await expect(
          guard.canActivate(ctxFor(HandlerX, "method")),
        ).rejects.toThrow(NotFoundException)
      })
    })

    describe("When FeaturesService.isEnabled rejects", () => {
      it("Then the rejection propagates unchanged and onDeny is not invoked", async () => {
        const boom = new Error("isEnabled rejected")
        const onDeny = jest.fn().mockReturnValue(new ForbiddenException())
        class HandlerWithOnDeny {
          @Feature("X", { onDeny })
          public method(): void {}
        }
        const { guard } = await resolveGuard(jest.fn().mockRejectedValue(boom))
        await expect(
          guard.canActivate(ctxFor(HandlerWithOnDeny, "method")),
        ).rejects.toBe(boom)
        expect(onDeny).not.toHaveBeenCalled()
      })
    })
  })

  describe("Given @Feature with an onDeny factory on the deny path", () => {
    describe("When FeaturesService.isEnabled resolves false", () => {
      it("Then the value returned by onDeny is thrown (not NotFoundException)", async () => {
        const { guard } = await resolveGuard(jest.fn().mockResolvedValue(false))
        await expect(
          guard.canActivate(ctxFor(HandlerXWithOnDeny, "method")),
        ).rejects.toBe(forbidden)
      })
    })

    describe("When onDeny throws synchronously", () => {
      it("Then the thrown value propagates", async () => {
        const boom = new Error("onDeny exploded")
        class Throws {
          @Feature("X", {
            onDeny: () => {
              throw boom
            },
          })
          public method(): void {}
        }
        const { guard } = await resolveGuard(jest.fn().mockResolvedValue(false))
        await expect(guard.canActivate(ctxFor(Throws, "method"))).rejects.toBe(
          boom,
        )
      })
    })

    describe("When onDeny returns a non-Error value", () => {
      it("Then the value is thrown as-is (consumer's responsibility)", async () => {
        class StringReturn {
          @Feature("X", { onDeny: () => "denied" as unknown as Error })
          public method(): void {}
        }
        const { guard } = await resolveGuard(jest.fn().mockResolvedValue(false))
        await expect(
          guard.canActivate(ctxFor(StringReturn, "method")),
        ).rejects.toBe("denied")
      })
    })

    describe("When onDeny is set but isEnabled admits", () => {
      it("Then onDeny is not invoked", async () => {
        const onDeny = jest.fn()
        class Admitted {
          @Feature("X", { onDeny })
          public method(): void {}
        }
        const { guard } = await resolveGuard(jest.fn().mockResolvedValue(true))
        await expect(
          guard.canActivate(ctxFor(Admitted, "method")),
        ).resolves.toBe(true)
        expect(onDeny).not.toHaveBeenCalled()
      })
    })

    describe("When onDeny is invoked", () => {
      it("Then it receives the in-flight express Request", async () => {
        const req = express.request()
        const onDeny = jest.fn().mockReturnValue(new ForbiddenException())
        class HandlerWithOnDeny {
          @Feature("X", { onDeny })
          public method(): void {}
        }
        const { guard } = await resolveGuard(jest.fn().mockResolvedValue(false))
        await expect(
          guard.canActivate(ctxFor(HandlerWithOnDeny, "method", req)),
        ).rejects.toBeInstanceOf(ForbiddenException)
        expect(onDeny).toHaveBeenCalledTimes(1)
        expect(onDeny.mock.calls[0][0]).toBe(req)
      })
    })
  })

  describe("Given @Feature on both controller and handler", () => {
    describe("When the handler-level flag is the one checked", () => {
      it("Then isEnabled is called with the handler flag, not the class flag", async () => {
        const isEnabled = jest.fn().mockResolvedValue(true)
        const { guard } = await resolveGuard(isEnabled)
        await expect(
          guard.canActivate(ctxFor(ClassAndHandler, "method")),
        ).resolves.toBe(true)
        expect(isEnabled).toHaveBeenCalledWith("HANDLER_FLAG")
        expect(isEnabled).not.toHaveBeenCalledWith("CLASS_FLAG")
      })
    })

    describe("When the handler has no options and the class has onDeny", () => {
      it("Then class-level onDeny is discarded and the guard falls back to NotFoundException", async () => {
        const { guard } = await resolveGuard(jest.fn().mockResolvedValue(false))
        await expect(
          guard.canActivate(ctxFor(ClassOnDenyHandlerPlain, "method")),
        ).rejects.toThrow(NotFoundException)
      })
    })

    describe("When the class has no onDeny and the handler does", () => {
      it("Then the handler-level onDeny is used", async () => {
        const { guard } = await resolveGuard(jest.fn().mockResolvedValue(false))
        await expect(
          guard.canActivate(ctxFor(ClassPlainHandlerOnDeny, "method")),
        ).rejects.toBe(forbidden)
      })
    })

    describe("When both class and handler have onDeny", () => {
      it("Then the handler-level onDeny fully overrides the class-level onDeny", async () => {
        const { guard } = await resolveGuard(jest.fn().mockResolvedValue(false))
        await expect(
          guard.canActivate(ctxFor(ClassAndHandlerOnDeny, "method")),
        ).rejects.toBeInstanceOf(ConflictException)
      })
    })
  })
})
