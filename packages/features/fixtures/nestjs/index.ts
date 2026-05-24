import type { ExecutionContext } from "@nestjs/common"

import { type MockRequest, type MockResponse, express } from "../express"

/**
 * Creates a partial ExecutionContext with a switchToHttp method that then allows
 * access to req and res through getRequest and getResponse methods respectively.
 *
 * ExecutionContext extends ArgumentsHost so use this function to create
 * ArgumentsHosts too.
 *
 * @param req A MockRequest that is returned when
 * switchToHttp().getRequest is called.
 * @param res A MockResponse that is returned when
 * switchToHttp().getResponse is called.
 * @param handler An optional handler function returned by getHandler().
 * When provided, getHandler and getClass are included on the returned
 * context, making it usable where a full ExecutionContext (not just
 * ArgumentsHost) is required -- e.g. guards that read decorator metadata.
 * @param cls An optional class returned by getClass(). When provided
 * alongside a handler, the class is used for getClass() instead of a
 * plain Object. This supports guards that read class-level metadata.
 * @returns A partial ExecutionContext that supports
 * switchToHttp and, when a handler is supplied, getHandler/getClass.
 */
export const executionContext = (
  req: MockRequest = express.request(),
  res: MockResponse = req.res,
  handler?: () => void,
  cls?: new (...args: any[]) => any,
): Partial<ExecutionContext> => {
  req.res = res
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue(res),
      getRequest: jest.fn().mockReturnValue(req),
    }),
    ...(handler && {
      getHandler: jest.fn().mockReturnValue(handler),
      getClass: jest.fn().mockReturnValue(cls ?? Object),
    }),
  }
}
