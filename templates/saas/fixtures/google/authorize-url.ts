/**
 * Builds the Google OAuth authorize URL from environment variables.
 *
 * Returns `null` when `GOOGLE_CLIENT_ID` is not set, matching the
 * behaviour of {@link ViewLocalsMiddleware}.
 */
export function buildGoogleAuthorizeUrl(): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return null
  }

  const appUrl = process.env.APP_URL!
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
