/**
 * Controls how MockServer matches request bodies.
 */
export enum MockserverMatchTypes {
  Strict = "STRICT",
  OnlyMatchingFields = "ONLY_MATCHING_FIELDS",
}

/**
 * The content type of a MockServer request body.
 */
export enum MockserverBodyTypes {
  JSON = "JSON",
  Form = "PARAMETERS",
}

/**
 * Limits an expectation to a fixed number of matches.
 */
export type MockserverSpecificTimes = {
  remainingTimes: number
}

/**
 * Allows an expectation to match an unlimited number of times.
 */
export type MockserverUnlimitedTimes = {
  unlimited: boolean
}

/**
 * Describes an HTTP request to match in MockServer.
 */
export type MockserverHttpRequest = {
  path: string
  method: string
  headers?: Record<string, string[]>
  queryStringParameters?: Record<string, string[]>
  body?: {
    type: MockserverBodyTypes
    json?: Record<string, any>
    parameters?: Record<string, string[]>
    matchType?: MockserverMatchTypes
  }
}

/**
 * Describes the HTTP response MockServer should return when
 * a matching request is received.
 */
export type MockserverHttpResponse = {
  statusCode: number
  body: string
  delay?: {
    timeUnit: "MILLISECONDS"
    value: number
  }
}

/**
 * Describes an HTTP error MockServer should simulate when
 * a matching request is received.
 */
export type MockserverHttpError = {
  dropConnection: boolean
  delay?: {
    timeUnit: "MILLISECONDS"
    value: number
  }
}

/**
 * A full MockServer expectation comprising the request to match,
 * the response or error to return, and how many times to match.
 */
export type MockserverExpectation = {
  httpRequest: MockserverHttpRequest
  httpResponse?: MockserverHttpResponse
  httpError?: MockserverHttpError
  times: MockserverSpecificTimes | MockserverUnlimitedTimes
}
