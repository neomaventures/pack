import { type Logger } from "@neomaventures/logging"
import { type CallHandler, type ExecutionContext } from "@nestjs/common"
import { of } from "rxjs"

import { type MockRequest, type MockResponse, express } from "../express"

/**
 * A mock service implementing the canonical `Logger` contract from
 * `@neomaventures/logging`.
 *
 * Each method is a `jest.Mock` matching the `Logger` signature
 * `(message: string, context?: LogContext) => void`.
 *
 * @property trace A jest function that mocks the trace method from Logger.
 * @property debug A jest function that mocks the debug method from Logger.
 * @property info A jest function that mocks the info method from Logger.
 * @property warn A jest function that mocks the warn method from Logger.
 * @property error A jest function that mocks the error method from Logger.
 * @property fatal A jest function that mocks the fatal method from Logger.
 */
export class MockLoggerService implements Logger {
  public trace = jest.fn()
  public debug = jest.fn()
  public info = jest.fn()
  public warn = jest.fn()
  public error = jest.fn()
  public fatal = jest.fn()
}

/**
 * Creates a CallHandler that emits the given value via an RxJS observable.
 *
 * @param returnValue - The value the handler should emit. Defaults to `{ ok: true }`.
 * @returns A CallHandler whose `handle()` returns `of(returnValue)`.
 */
export const callHandler = (returnValue: any = { ok: true }): CallHandler =>
  ({ handle: () => of(returnValue) }) as CallHandler

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
 * @param type The context type returned by getType(). Defaults to "http" since
 * that's overwhelmingly the most common case in tests. Pass "rpc" or "ws" to
 * exercise non-HTTP code paths (e.g. an interceptor that should reject non-HTTP
 * routes).
 * @returns A partial ExecutionContext that supports switchToHttp, getType, and,
 * when a handler is supplied, getHandler/getClass.
 */
export const executionContext = <T>(
  req: MockRequest = express.request(),
  res: MockResponse = req.res,
  handler?:
    | (() => void)
    | { controller: new (...args: any[]) => T; method: keyof T & string },
  cls?: new (...args: any[]) => any,
  type: string = "http",
): Partial<ExecutionContext> => {
  req.res = res

  let resolvedHandler: (() => void) | undefined
  let resolvedClass: (new (...args: any[]) => any) | undefined

  if (typeof handler === "function") {
    // Features pattern: bare handler + optional class
    resolvedHandler = handler
    resolvedClass = cls ?? Object
  } else if (handler) {
    // Auth pattern: typed route object
    resolvedHandler = handler.controller.prototype[handler.method]
    resolvedClass = handler.controller
  }

  return {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue(res),
      getRequest: jest.fn().mockReturnValue(req),
    }),
    getType: jest.fn().mockReturnValue(type),
    ...(resolvedHandler && {
      getHandler: jest.fn().mockReturnValue(resolvedHandler),
      getClass: jest.fn().mockReturnValue(resolvedClass),
    }),
  }
}
