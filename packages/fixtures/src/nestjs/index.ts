import { type ExecutionContext } from "@nestjs/common"

import { type MockRequest, type MockResponse, express } from "../express"

/**
 * Creates a partial ExecutionContext with a switchToHttp method that then allows
 * access to req and res through getRequest and getResponse methods respectively.
 *
 * ExecutionContext extends ArgumentsHost so use this function to create
 * ArgumentsHosts too.
 *
 * @param req A MockRequest that is returned when switchToHttp().getRequest is called.
 * @param res A MockResponse that is returned when switchToHttp().getResponse is called.
 * @param handler Either a bare handler function (for isolated guard testing where
 * metadata is applied with Reflect.defineMetadata) or a typed route object (for
 * integration-style testing where metadata lives on a real controller). When omitted,
 * getHandler and getClass are not included on the returned context.
 * @param cls An optional class returned by getClass(). Only meaningful when handler
 * is a bare function; ignored when handler is a route object. Defaults to Object.
 * @returns A partial ExecutionContext that supports switchToHttp and, when a handler
 * is supplied, getHandler/getClass.
 */
export const executionContext = <T>(
  req: MockRequest = express.request(),
  res: MockResponse = req.res,
  handler?:
    | (() => void)
    | { controller: new (...args: any[]) => T; method: keyof T & string },
  cls?: new (...args: any[]) => any,
): Partial<ExecutionContext> => {
  req.res = res

  let resolvedHandler: (() => void) | undefined
  let resolvedClass: (new (...args: any[]) => any) | undefined

  if (typeof handler === "function") {
    // Features pattern: bare handler + optional class
    resolvedHandler = handler
    resolvedClass = cls ?? Object
  } else if (handler) {
    // Garmr pattern: typed route object
    resolvedHandler = handler.controller.prototype[handler.method]
    resolvedClass = handler.controller
  }

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue(res),
      getRequest: jest.fn().mockReturnValue(req),
    }),
    ...(resolvedHandler && {
      getHandler: jest.fn().mockReturnValue(resolvedHandler),
      getClass: jest.fn().mockReturnValue(resolvedClass),
    }),
  }
}
