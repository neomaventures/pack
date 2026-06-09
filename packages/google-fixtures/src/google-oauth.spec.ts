import { faker } from "@faker-js/faker"
import {
  type MockServerConfig,
  MockServerClient,
  startContainer,
  stopContainer,
} from "@neomaventures/mockserver"
import * as jwt from "jsonwebtoken"

import { GoogleOAuth } from "./google-oauth"

describe("GoogleOAuth", () => {
  describe("clientId()", () => {
    it("should return a string ending with .apps.googleusercontent.com", () => {
      expect(GoogleOAuth.clientId()).toMatch(
        /^\d{11}-[a-z0-9]{31}\.apps\.googleusercontent\.com$/i,
      )
    })

    it("should return a different value on each call", () => {
      expect(GoogleOAuth.clientId()).not.toBe(GoogleOAuth.clientId())
    })
  })

  describe("clientSecret()", () => {
    it("should return a string matching the expected format", () => {
      expect(GoogleOAuth.clientSecret()).toMatch(
        /^[a-z]{6}-[a-z0-9]{19}-[a-z0-9]{8}$/i,
      )
    })
  })

  describe("aud()", () => {
    it("should return a string ending with .apps.googleusercontent.com", () => {
      expect(GoogleOAuth.aud()).toMatch(/\.apps\.googleusercontent\.com$/)
    })
  })

  describe("sub()", () => {
    it("should return a 10-digit numeric string", () => {
      expect(GoogleOAuth.sub()).toMatch(/^\d{10}$/)
    })
  })

  describe("code()", () => {
    it("should return a string starting with '4/'", () => {
      expect(GoogleOAuth.code()).toMatch(/^4\//)
    })
  })

  describe("accessToken()", () => {
    it("should return a string starting with '1/'", () => {
      expect(GoogleOAuth.accessToken()).toMatch(/^1\//)
    })
  })

  describe("refreshToken()", () => {
    it("should return a string starting with '1//'", () => {
      expect(GoogleOAuth.refreshToken()).toMatch(/^1\/\//)
    })
  })

  describe("scopes()", () => {
    it("should return an array containing userinfo.email and userinfo.profile scopes", () => {
      const scopes = GoogleOAuth.scopes()

      expect(scopes).toContain(
        "https://www.googleapis.com/auth/userinfo.email",
      )
      expect(scopes).toContain(
        "https://www.googleapis.com/auth/userinfo.profile",
      )
    })
  })

  describe("idToken()", () => {
    describe("Given no overrides", () => {
      it("should return a valid JWT", () => {
        const token = GoogleOAuth.idToken()
        const decoded = jwt.decode(token)

        expect(decoded).not.toBeNull()
      })

      it("should include default claims", () => {
        const token = GoogleOAuth.idToken()
        const decoded = jwt.decode(token) as Record<string, any>

        expect(decoded.iss).toBe("https://accounts.google.com")
        expect(decoded.sub).toBeDefined()
        expect(decoded.aud).toBeDefined()
        expect(decoded.email).toBeDefined()
        expect(decoded.name).toBeDefined()
        expect(decoded.picture).toBeDefined()
      })
    })

    describe("Given partial overrides", () => {
      it("should use overridden claims and fill in defaults for the rest", () => {
        const email = "custom@example.com"
        const sub = "9999999999"
        const token = GoogleOAuth.idToken({ email, sub })
        const decoded = jwt.decode(token) as Record<string, any>

        expect(decoded.email).toBe(email)
        expect(decoded.sub).toBe(sub)
        expect(decoded.iss).toBe("https://accounts.google.com")
        expect(decoded.name).toBeDefined()
      })
    })

    describe("Given email_verified override", () => {
      it("should include the email_verified claim", () => {
        const token = GoogleOAuth.idToken({ email_verified: false })
        const decoded = jwt.decode(token) as Record<string, any>

        expect(decoded.email_verified).toBe(false)
      })
    })

    describe("Given arbitrary extra claims", () => {
      it("should include them in the token", () => {
        const token = GoogleOAuth.idToken({ custom_claim: "hello" })
        const decoded = jwt.decode(token) as Record<string, any>

        expect(decoded.custom_claim).toBe("hello")
      })
    })
  })

  describe("tokenResponse()", () => {
    it("should return a complete token response containing the given idToken", () => {
      const idToken = GoogleOAuth.idToken()
      const response = GoogleOAuth.tokenResponse(idToken)

      expect(response).toMatchObject({
        access_token: expect.stringMatching(/^1\//),
        expires_in: 3600,
        token_type: "Bearer",
        scope: expect.stringContaining("userinfo.email"),
        id_token: idToken,
      })
    })
  })

  // ---------------------------------------------------------------------------
  // MockServer helpers (requires Docker)
  // ---------------------------------------------------------------------------

  describe("tokenEndpoint()", () => {
    it("should strip /mockserver and append /token", () => {
      expect(
        GoogleOAuth.tokenEndpoint("http://localhost:1080/mockserver"),
      ).toBe("http://localhost:1080/token")
    })

    it("should handle a URL without /mockserver suffix", () => {
      expect(GoogleOAuth.tokenEndpoint("http://localhost:1080")).toBe(
        "http://localhost:1080/token",
      )
    })
  })

  describe("MockServer expectations", () => {
    const prefix = `neoma-test-gf-${faker.string.alphanumeric(4)}`
    const port = 15_080 + faker.number.int({ min: 0, max: 899 })
    let config: MockServerConfig
    let client: MockServerClient
    let baseUrl: string

    beforeAll(async () => {
      config = await startContainer({ prefix, port })
      const managementUrl = `http://localhost:${config.port}/mockserver`
      client = new MockServerClient(managementUrl)
      baseUrl = `http://localhost:${config.port}`
    }, 60_000)

    afterAll(async () => {
      await stopContainer({ prefix })
    })

    beforeEach(async () => {
      await client.reset()
    })

    describe("mockCodeExchange()", () => {
      it("should register an expectation that responds with a token response", async () => {
        const code = GoogleOAuth.code()
        const clientId = GoogleOAuth.clientId()
        const clientSecret = GoogleOAuth.clientSecret()
        const redirectUri = faker.internet.url()

        const response = await GoogleOAuth.mockCodeExchange(client, {
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
        const code = GoogleOAuth.code()
        const clientId = GoogleOAuth.clientId()
        const clientSecret = GoogleOAuth.clientSecret()
        const redirectUri = faker.internet.url()

        await GoogleOAuth.mockCodeExchange(client, {
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
        const code = GoogleOAuth.code()
        const clientId = GoogleOAuth.clientId()
        const clientSecret = GoogleOAuth.clientSecret()
        const redirectUri = faker.internet.url()
        const customToken = GoogleOAuth.idToken({ email: "test@example.com" })

        const response = await GoogleOAuth.mockCodeExchange(client, {
          code,
          clientId,
          clientSecret,
          redirectUri,
          idToken: customToken,
        })

        expect(response.id_token).toBe(customToken)
      })

      it("should respect times override", async () => {
        const code = GoogleOAuth.code()
        const clientId = GoogleOAuth.clientId()
        const clientSecret = GoogleOAuth.clientSecret()
        const redirectUri = faker.internet.url()

        await GoogleOAuth.mockCodeExchange(client, {
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
        const code = GoogleOAuth.code()

        const error = await GoogleOAuth.mockCodeExchangeHttpError(client, {
          code,
        })

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
        const code = GoogleOAuth.code()

        await GoogleOAuth.mockCodeExchangeHttpError(client, {
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
        const code = GoogleOAuth.code()

        await GoogleOAuth.mockCodeExchangeNetworkError(client, { code })

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
})
