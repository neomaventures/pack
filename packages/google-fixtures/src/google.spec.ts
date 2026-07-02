import * as jwt from "jsonwebtoken"

import { google } from "./google"

describe("google", () => {
  describe("clientId()", () => {
    it("should return a string ending with .apps.googleusercontent.com", () => {
      expect(google.clientId()).toMatch(
        /^\d{11}-[a-z0-9]{31}\.apps\.googleusercontent\.com$/i,
      )
    })

    it("should return a different value on each call", () => {
      expect(google.clientId()).not.toBe(google.clientId())
    })
  })

  describe("clientSecret()", () => {
    it("should return a string matching the expected format", () => {
      expect(google.clientSecret()).toMatch(
        /^[a-z]{6}-[a-z0-9]{19}-[a-z0-9]{8}$/i,
      )
    })
  })

  describe("aud()", () => {
    it("should return a string ending with .apps.googleusercontent.com", () => {
      expect(google.aud()).toMatch(/\.apps\.googleusercontent\.com$/)
    })
  })

  describe("sub()", () => {
    it("should return a 10-digit numeric string", () => {
      expect(google.sub()).toMatch(/^\d{10}$/)
    })
  })

  describe("code()", () => {
    it("should return a string starting with '4/'", () => {
      expect(google.code()).toMatch(/^4\//)
    })
  })

  describe("accessToken()", () => {
    it("should return a string starting with '1/'", () => {
      expect(google.accessToken()).toMatch(/^1\//)
    })
  })

  describe("refreshToken()", () => {
    it("should return a string starting with '1//'", () => {
      expect(google.refreshToken()).toMatch(/^1\/\//)
    })
  })

  describe("scopes()", () => {
    it("should return an array containing userinfo.email and userinfo.profile scopes", () => {
      const scopes = google.scopes()

      expect(scopes).toContain("https://www.googleapis.com/auth/userinfo.email")
      expect(scopes).toContain(
        "https://www.googleapis.com/auth/userinfo.profile",
      )
    })
  })

  describe("requiredScopes()", () => {
    it("should return an array containing only openid", () => {
      expect(google.requiredScopes()).toEqual(["openid"])
    })
  })

  describe("sensibleScopes()", () => {
    it("should return openid, email, and profile when called with no arguments", () => {
      expect(google.sensibleScopes()).toEqual(["openid", "email", "profile"])
    })

    it("should append any extras after the sensible defaults", () => {
      const extra = "https://www.googleapis.com/auth/gmail.readonly"
      expect(google.sensibleScopes([extra])).toEqual([
        "openid",
        "email",
        "profile",
        extra,
      ])
    })

    it("should return the defaults unchanged when extras is an empty array", () => {
      expect(google.sensibleScopes([])).toEqual(["openid", "email", "profile"])
    })
  })

  describe("authorizeUrl()", () => {
    it("should return a URL with the given client ID, redirect URI, and scopes", () => {
      const url = new URL(
        google.authorizeUrl("my-client-id", "http://localhost:3000/callback", [
          "openid",
          "email",
        ]),
      )

      expect(url.origin).toBe("https://accounts.google.com")
      expect(url.pathname).toBe("/o/oauth2/v2/auth")
      expect(url.searchParams.get("client_id")).toBe("my-client-id")
      expect(url.searchParams.get("redirect_uri")).toBe(
        "http://localhost:3000/callback",
      )
      expect(url.searchParams.get("response_type")).toBe("code")
      expect(url.searchParams.get("scope")).toBe("openid email")
    })
  })

  describe("idToken()", () => {
    describe("Given no overrides", () => {
      it("should return a valid JWT", () => {
        const token = google.idToken()
        const decoded = jwt.decode(token)

        expect(decoded).not.toBeNull()
      })

      it("should include default claims", () => {
        const token = google.idToken()
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
        const token = google.idToken({ email, sub })
        const decoded = jwt.decode(token) as Record<string, any>

        expect(decoded.email).toBe(email)
        expect(decoded.sub).toBe(sub)
        expect(decoded.iss).toBe("https://accounts.google.com")
        expect(decoded.name).toBeDefined()
      })
    })

    describe("Given email_verified override", () => {
      it("should include the email_verified claim", () => {
        const token = google.idToken({ email_verified: false })
        const decoded = jwt.decode(token) as Record<string, any>

        expect(decoded.email_verified).toBe(false)
      })
    })

    describe("Given arbitrary extra claims", () => {
      it("should include them in the token", () => {
        const token = google.idToken({ custom_claim: "hello" })
        const decoded = jwt.decode(token) as Record<string, any>

        expect(decoded.custom_claim).toBe("hello")
      })
    })
  })

  describe("tokenResponse()", () => {
    it("should return a complete token response containing the given idToken", () => {
      const idToken = google.idToken()
      const response = google.tokenResponse(idToken)

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
