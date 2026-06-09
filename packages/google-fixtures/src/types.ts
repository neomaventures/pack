/**
 * Claims embedded in a Google ID token JWT.
 *
 * All fields are optional so callers can override only the claims they care
 * about when generating test tokens via {@link GoogleOAuth.idToken}.
 *
 * @see https://developers.google.com/identity/protocols/oauth2/openid-connect#an-id-tokens-payload
 */
export type GoogleIdTokenClaims = {
  /** Token issuer (e.g. `https://accounts.google.com`) */
  iss: string
  /** Subject identifier — unique Google account ID */
  sub: string
  /** Audience — the OAuth client ID the token was issued for */
  aud: string
  /** The user's email address */
  email: string
  /** Whether Google has verified the email address */
  email_verified: boolean
  /** The user's full name */
  name: string
  /** URL of the user's profile picture */
  picture: string
} & Record<string, any>

/**
 * Shape of a successful Google OAuth code exchange response.
 *
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
 */
export type GoogleOAuthCodeExchangeResponse = {
  /** The access token for accessing Google APIs */
  access_token: string
  /** Token lifetime in seconds */
  expires_in: number
  /** Token type, typically "Bearer" */
  token_type: string
  /** The OAuth scopes granted */
  scope: string
  /** The ID token containing user profile claims */
  id_token: string
}

/**
 * Shape of an error response from Google's token endpoint.
 */
export type GoogleOAuthCodeExchangeError = {
  /** The HTTP status code */
  statusCode: number
  /** The error response body */
  body: {
    error: string
    error_description: string
  }
}
