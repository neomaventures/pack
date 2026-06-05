import { createHmac } from "crypto"

/**
 * Computes a valid Svix-standard HMAC-SHA256 signature for the given
 * parameters, returning the full `v1,<base64>` string.
 *
 * @param secret - The webhook signing secret (with or without `whsec_` prefix)
 * @param svixId - The Svix message ID header value
 * @param svixTimestamp - The Svix timestamp header value
 * @param body - The raw request body string
 * @returns The computed signature in `v1,<base64>` format
 */
export const computeSignature = (
  secret: string,
  svixId: string,
  svixTimestamp: string,
  body: string,
): string => {
  const keyBase64 = secret.startsWith("whsec_") ? secret.slice(6) : secret
  const key = Buffer.from(keyBase64, "base64")
  const signedContent = `${svixId}.${svixTimestamp}.${body}`
  const signature = createHmac("sha256", key)
    .update(signedContent)
    .digest("base64")
  return `v1,${signature}`
}
