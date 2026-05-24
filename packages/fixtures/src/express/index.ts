import crypto from "crypto"
import {
  type IncomingHttpHeaders,
  type OutgoingHttpHeader,
  type OutgoingHttpHeaders,
} from "http"
import { type Socket } from "net"

import { faker } from "@faker-js/faker"

const { helpers, internet, system } = faker

const caseInsensitiveSearch = (
  obj: OutgoingHttpHeaders,
  key: string,
): OutgoingHttpHeader | undefined => {
  return obj[key.toLowerCase()]
}

const convertHeadersToLowerCase = <T extends Record<string, unknown>>(
  headers: T = {} as T,
): T => {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(headers)) {
    result[key.toLowerCase()] = headers[key]
  }
  return result as T
}

/**
 * Mirrors the Express Response interface — method signatures match
 * express.Response, not the underlying Node http.ServerResponse.
 */
export interface MockResponse {
  statusCode?: number
  getHeaders(): OutgoingHttpHeaders
  get(name: string): string | undefined
  header(field: string, value?: string | Array<string>): MockResponse
  getHeader(name: string): string | number | string[] | undefined
  setHeader(name: string, value: string | string[]): MockResponse
  removeHeader(name: string): void
  cookie: jest.Mock
  clearCookie: jest.Mock
  end: jest.Mock
  status(code: number): MockResponse
  json: jest.Mock
  render: jest.Mock
  redirect: jest.Mock
  send: jest.Mock
  locals: Record<string, any>
}

export interface MockRequest {
  get(name: string): any
  header(name: string): any
  body: any
  headers: IncomingHttpHeaders
  method: string
  url: string
  res: MockResponse
  path: string
  params: Record<string, string>
  signedCookies: Record<string, string>
  connection: Socket
  [key: string]: any
}

type ExpressFixtures = {
  /**
   * Creates a signed cookie string using the provided value and secret according
   * to how the cookie-parser library would sign a cookie, i.e. HMAC-SHA256.
   *
   * @param val The cookie value to sign. If an object, it will be JSON.stringified
   * with the `s:j:` prefix before signing.
   * @param secret The secret to use to sign the cookie. If not provided, an unsigned
   * cookie will be returned.
   *
   * @returns The signed value string only — no cookie name prefix, no flags.
   * Format: `${encodedPrefix}${value}.${encodedSignature}`
   */
  cookie(val: string | object, secret?: string): string

  /**
   * Creates a MockResponse with status, json, and header functions that
   * are instances of a jest.Mock and with a locals property.
   *
   * @param options.locals Any locals to populate the response's locals property.
   * @param options.headers Any headers to set on the response. They will be accessible through
   * both the getHeaders and get functions.
   *
   * @returns A MockResponse with status, get, getHeaders, getHeader, setHeader,
   * removeHeader, json, header, render, redirect, send, cookie, clearCookie,
   * and end functions, and a locals property.
   */
  response: (options?: {
    locals?: Record<string, any>
    headers?: OutgoingHttpHeaders
  }) => MockResponse

  /**
   * Creates a MockRequest with body, and headers properties, and a mock response
   * object. Also adds convenience methods get and header to provide case insensitive
   * access to the request headers.
   *
   * @param req A Partial MockRequest to provide values for body, headers, and res objects,
   * and get, and headers functions. Any properties not provided will use sensible defaults.
   */
  request: (options?: Partial<MockRequest>) => MockRequest
}

export const express: ExpressFixtures = {
  cookie(val: string | object, secret: string | undefined): string {
    const cookieValue =
      typeof val === "string" ? val : `j:${JSON.stringify(val)}`
    const prefix = "s:"

    if (!secret) {
      return `${encodeURIComponent(prefix)}${cookieValue}`
    }

    const signature = crypto
      .createHmac("sha256", secret)
      .update(cookieValue)
      .digest("base64")
      .replace(/=+$/, "")

    return `${encodeURIComponent(prefix)}${cookieValue}.${encodeURIComponent(signature)}`
  },

  response(
    {
      locals = {},
      headers = {},
    }: { locals?: Record<string, any>; headers?: OutgoingHttpHeaders } = {
      locals: {},
      headers: {},
    },
  ): MockResponse {
    const clonedHeaders = convertHeadersToLowerCase(headers)
    return {
      getHeaders(): OutgoingHttpHeaders {
        return clonedHeaders
      },
      get(name: string): string | undefined {
        return caseInsensitiveSearch(clonedHeaders, name) as string
      },
      header(field: string, value?: string | Array<string>): MockResponse {
        clonedHeaders[field.toLowerCase()] = value
        return this
      },
      getHeader(name: string): string | number | string[] | undefined {
        return clonedHeaders[name.toLowerCase()] as
          | string
          | number
          | string[]
          | undefined
      },
      setHeader(name: string, value: string | string[]): MockResponse {
        clonedHeaders[name.toLowerCase()] = value
        return this
      },
      removeHeader(name): void {
        delete clonedHeaders[name]
        delete clonedHeaders[name.toLowerCase()]
      },
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      status(code: number): MockResponse {
        this.statusCode = code
        return this
      },
      json: jest.fn().mockReturnThis(),
      render: jest.fn(),
      redirect: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      locals,
    }
  },

  request(
    {
      body = {},
      headers = {},
      method = helpers.arrayElement(["GET", "POST", "PUT", "DELETE", "PATCH"]),
      url = internet.url(),
      res = express.response(),
      path = system.filePath(),
      params = {},
      signedCookies = {},
    }: Partial<MockRequest> = {
      body: {},
      headers: {},
      method: helpers.arrayElement(["GET", "POST", "PUT", "DELETE", "PATCH"]),
      url: internet.url(),
      res: express.response(),
      path: system.filePath(),
      params: {},
      signedCookies: {},
    },
  ): MockRequest {
    // Build the base object with the arguments spread, then normalize headers
    // afterward so that the spread cannot re-add un-normalized keys.
    const base = {
      body,
      method,
      url,
      res,
      path,
      params,
      signedCookies,
      // eslint-disable-next-line prefer-rest-params
      ...(arguments[0] as Partial<MockRequest>),
    }
    const normalizedHeaders = convertHeadersToLowerCase(base.headers ?? headers)
    return {
      get(name: string): any {
        return normalizedHeaders[name.toLowerCase()]
      },
      header(name: string): any {
        return normalizedHeaders[name.toLowerCase()]
      },
      ...base,
      headers: normalizedHeaders,
      // Must include the connection so that the Bunyan req serializer treats it as a real request.
      connection: {} as Socket,
    }
  },
} as const
