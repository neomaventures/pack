import { lastValueFrom } from "rxjs"

import { express } from "../express"

import { callHandler, executionContext } from "./index"

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

  it("should default getType() to 'http'", () => {
    const ctx = executionContext()

    expect(ctx.getType!()).toBe("http")
  })

  it("should return the provided type from getType()", () => {
    const ctx = executionContext(
      express.request(),
      undefined,
      undefined,
      undefined,
      "rpc",
    )

    expect(ctx.getType!()).toBe("rpc")
  })
})

describe("callHandler", () => {
  it("should return the default value when no argument is provided", async () => {
    const next = callHandler()
    const result = await lastValueFrom(next.handle())

    expect(result).toEqual({ ok: true })
  })

  it("should return the provided value", async () => {
    const expected = { handled: true }
    const next = callHandler(expected)
    const result = await lastValueFrom(next.handle())

    expect(result).toEqual(expected)
  })
})
