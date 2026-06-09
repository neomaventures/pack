import { GoogleOAuthClient } from "@neomaventures/google-fixtures"
import { MockServerClient } from "@neomaventures/mockserver"

/**
 * Creates a fresh {@link GoogleOAuthClient} backed by the running
 * MockServer instance. The `MOCKSERVER_URL` environment variable
 * must be set by the e2e global setup.
 *
 * Also resets all MockServer expectations via a `beforeEach` hook
 * when running inside a Jest test environment.
 */
export function createGoogleOAuthClient(): {
  mockServerClient: MockServerClient
  googleOAuth: GoogleOAuthClient
} {
  const mockServerClient = new MockServerClient(process.env.MOCKSERVER_URL!)
  const googleOAuth = new GoogleOAuthClient(mockServerClient)
  return { mockServerClient, googleOAuth }
}

/** The Google OAuth client ID from the test environment. */
export const googleClientId = process.env.GOOGLE_CLIENT_ID!

/** The Google OAuth client secret from the test environment. */
export const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET!

/** The Google OAuth redirect URI for the test app. */
export const googleRedirectUri = `${process.env.APP_URL!}/auth/google/callback`
