/**
 * Extracts the callback URL from a magic link email's HTML body.
 *
 * @param message - The Mailpit message containing HTML with the callback link.
 * @returns The parsed callback URL.
 * @throws If no callback URL is found in the email HTML.
 */
export function extractCallbackUrl(message: { HTML: string }): URL {
  const href = message.HTML.match(/href="([^"]*callback[^"]*)"/)?.[1]
  if (!href) {
    throw new Error("No callback URL found in email HTML")
  }
  return new URL(href)
}

/** Regex matching a valid session cookie in a Set-Cookie header. */
export const SESSION_COOKIE_REGEX =
  /auth\.sid=.+; Max-Age=\d+; Path=\/; HttpOnly; SameSite=Lax/
