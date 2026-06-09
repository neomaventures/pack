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
})
