import { faker } from "@faker-js/faker"
import {
  type MockServerConfig,
  MockServerClient,
  startContainer,
  stopContainer,
} from "@neomaventures/mockserver"

import { google } from "./google"
import { GoogleOAuthClient } from "./google-oauth-client"

describe("GoogleOAuthClient", () => {
  const prefix = `neoma-test-gf-${faker.string.alphanumeric(4)}`
  const port = 15_080 + faker.number.int({ min: 0, max: 899 })
  let config: MockServerConfig
  let mockServerClient: MockServerClient
  let googleOAuth: GoogleOAuthClient
  let baseUrl: string

  beforeAll(async () => {
    config = await startContainer({ prefix, port })
    const managementUrl = `http://localhost:${config.port}/mockserver`
    mockServerClient = new MockServerClient(managementUrl)
    googleOAuth = new GoogleOAuthClient(mockServerClient, managementUrl)
    baseUrl = `http://localhost:${config.port}`
  }, 60_000)

  afterAll(async () => {
    await stopContainer({ prefix })
  })

  beforeEach(async () => {
    await mockServerClient.reset()
  })

  describe("tokenEndpoint()", () => {
    it("should return the mock token endpoint URL", () => {
      expect(googleOAuth.tokenEndpoint()).toBe(`${baseUrl}/token`)
    })
  })

  describe("mockCodeExchange()", () => {
    it("should register an expectation that responds with a token response", async () => {
      const code = google.code()
      const clientId = google.clientId()
      const clientSecret = google.clientSecret()
      const redirectUri = faker.internet.url()

      const response = await googleOAuth.mockCodeExchange({
        code,
        clientId,
        clientSecret,
        redirectUri,
      })

      const result = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      })

      expect(result.status).toBe(200)

      const body = await result.json()
      expect(body).toMatchObject({
        access_token: response.access_token,
        id_token: response.id_token,
        expires_in: 3600,
        token_type: "Bearer",
      })
    })

    it("should default to remainingTimes: 1", async () => {
      const code = google.code()
      const clientId = google.clientId()
      const clientSecret = google.clientSecret()
      const redirectUri = faker.internet.url()

      await googleOAuth.mockCodeExchange({
        code,
        clientId,
        clientSecret,
        redirectUri,
      })

      const params = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString()

      const first = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: params,
      })
      expect(first.status).toBe(200)

      const second = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: params,
      })
      expect(second.status).toBe(404)
    })

    it("should use a custom idToken when provided", async () => {
      const code = google.code()
      const clientId = google.clientId()
      const clientSecret = google.clientSecret()
      const redirectUri = faker.internet.url()
      const customToken = google.idToken({ email: faker.internet.email() })

      const response = await googleOAuth.mockCodeExchange({
        code,
        clientId,
        clientSecret,
        redirectUri,
        idToken: customToken,
      })

      expect(response.id_token).toBe(customToken)
    })

    it("should include refresh_token when provided", async () => {
      const code = google.code()
      const clientId = google.clientId()
      const clientSecret = google.clientSecret()
      const redirectUri = faker.internet.url()
      const refreshToken = google.refreshToken()

      const response = await googleOAuth.mockCodeExchange({
        code,
        clientId,
        clientSecret,
        redirectUri,
        refreshToken,
      })

      expect(response.refresh_token).toBe(refreshToken)

      const result = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      })

      const body = await result.json()
      expect(body.refresh_token).toBe(refreshToken)
    })

    it("should respect times override", async () => {
      const code = google.code()
      const clientId = google.clientId()
      const clientSecret = google.clientSecret()
      const redirectUri = faker.internet.url()

      await googleOAuth.mockCodeExchange({
        code,
        clientId,
        clientSecret,
        redirectUri,
        times: { unlimited: true },
      })

      const params = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString()

      const first = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: params,
      })
      expect(first.status).toBe(200)

      const second = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: params,
      })
      expect(second.status).toBe(200)
    })
  })

  describe("mockCodeExchangeHttpError()", () => {
    it("should register an expectation that responds with an error", async () => {
      const code = google.code()

      const error = await googleOAuth.mockCodeExchangeHttpError({ code })

      const result = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code }).toString(),
      })

      expect(result.status).toBe(400)

      const body = await result.json()
      expect(body).toMatchObject({
        error: error.body.error,
        error_description: error.body.error_description,
      })
    })

    it("should use custom statusCode and error when provided", async () => {
      const code = google.code()

      await googleOAuth.mockCodeExchangeHttpError({
        code,
        statusCode: 500,
        error: "server_error",
        errorDescription: "Internal Server Error",
      })

      const result = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code }).toString(),
      })

      expect(result.status).toBe(500)

      const body = await result.json()
      expect(body).toMatchObject({
        error: "server_error",
        error_description: "Internal Server Error",
      })
    })
  })

  describe("mockCodeExchangeNetworkError()", () => {
    it("should register an expectation that drops the connection", async () => {
      const code = google.code()

      await googleOAuth.mockCodeExchangeNetworkError({ code })

      await expect(
        fetch(`${baseUrl}/token`, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code }).toString(),
        }),
      ).rejects.toThrow()
    })
  })
})
