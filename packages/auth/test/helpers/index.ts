import { type Server } from "http"

import { MailpitClient } from "@neomaventures/mailpit"
import { type INestApplication } from "@nestjs/common"
import request from "supertest"

const mailpit = new MailpitClient(process.env.MAILPIT_API!)

export interface AuthResult {
  /** The session JWT from the response body */
  token: string
  /** The raw Set-Cookie header value */
  cookie: string
  /** The authenticated user */
  user: { id: string; email: string }
}

const authenticateViaEmail = async (
  app: INestApplication,
  email: string,
): Promise<AuthResult> => {
  const server = app.getHttpServer() as Server

  await request(server).post("/magic-link").send({ email }).expect(202)

  const { messages } = await mailpit.messages()
  const message = await mailpit.message(messages[0].ID as string)
  const verificationUrl = message.Text.match(
    /[a-z]+[:.].*?(?=\s)/,
  )![0] as string
  const magicLinkToken = verificationUrl.substring(
    verificationUrl.indexOf("=") + 1,
  )

  const response = await request(server)
    .get("/magic-link/verify")
    .query({ token: magicLinkToken })
    .expect(200)

  const setCookie = response.headers["set-cookie"]

  return {
    token: response.body.token,
    cookie: Array.isArray(setCookie) ? setCookie[0] : setCookie,
    user: response.body.user,
  }
}

const extractCookieValue = (setCookie: string): string => {
  return setCookie.split(";")[0]
}

export const helpers = {
  authenticateViaEmail,
  extractCookieValue,
}
