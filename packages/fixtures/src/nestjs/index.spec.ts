import { express } from "../express"

import { executionContext } from "./index"

describe("executionContext", () => {
  it("should return switchToHttp with req and res", () => {
    const req = express.request()
    const res = express.response()

    const ctx = executionContext(req, res)

    const http = ctx.switchToHttp!()
    expect(http.getRequest()).toBe(req)
    expect(http.getResponse()).toBe(res)
  })

  it("should not include getHandler/getClass when no handler is provided", () => {
    const ctx = executionContext()

    expect(ctx.getHandler).toBeUndefined()
    expect(ctx.getClass).toBeUndefined()
  })

  it("should resolve a bare handler function and default class to Object", () => {
    const handler = (): void => {}

    const ctx = executionContext(express.request(), undefined, handler)

    expect(ctx.getHandler!()).toBe(handler)
    expect(ctx.getClass!()).toBe(Object)
  })

  it("should resolve a bare handler function with a custom class", () => {
    const handler = (): void => {}
    class MyController {}

    const ctx = executionContext(
      express.request(),
      undefined,
      handler,
      MyController,
    )

    expect(ctx.getHandler!()).toBe(handler)
    expect(ctx.getClass!()).toBe(MyController)
  })

  it("should resolve a typed route object", () => {
    class UserController {
      public findAll(): void {}
    }

    const ctx = executionContext(express.request(), undefined, {
      controller: UserController,
      method: "findAll",
    })

    expect(ctx.getHandler!()).toBe(UserController.prototype.findAll)
    expect(ctx.getClass!()).toBe(UserController)
  })
})
