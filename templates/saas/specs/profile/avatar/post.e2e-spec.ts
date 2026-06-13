import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { StorageService } from "@neomaventures/storage"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"
import { DataSource } from "typeorm"

import { Account } from "~auth/account.entity"
import { authenticate } from "~fixtures/auth/e2e"
import { configureViewEngine } from "~fixtures/configure-view-engine"

const {
  BAD_REQUEST,
  FOUND,
  PAYLOAD_TOO_LARGE,
  UNAUTHORIZED,
  UNSUPPORTED_MEDIA_TYPE,
} = HttpStatus

/**
 * 1×1 transparent PNG. Smallest valid PNG buffer — keeps the multipart body
 * tiny while still passing magic-byte sniffing if any future middleware
 * decides to check.
 */
const tinyPngBuffer = (): Buffer =>
  Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4" +
      "890000000d49444154789c626001000000050001a7c66ec00000000049454e44ae426082",
    "hex",
  )

const jpegOfSize = (bytes: number): Buffer => {
  const buffer = Buffer.alloc(bytes)
  for (let i = 0; i < bytes; i++) {
    buffer[i] = i % 256
  }
  return buffer
}

const fetchSignedUrl = async (url: string): Promise<Buffer> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch signed URL: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

describe("POST /profile/avatar", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({ configure: configureViewEngine })
  })

  describe("When an authenticated request uploads a valid JPEG under the size limit", () => {
    it(`should respond with HTTP ${FOUND} redirecting to /profile`, async () => {
      const cookie = await authenticate(app, faker.internet.email())

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .attach("file", jpegOfSize(2_048), {
          filename: "avatar.jpg",
          contentType: "image/jpeg",
        })
        .expect(FOUND)
        .expect("Location", "/profile")
    })

    it("should populate Account.avatar and store the object at accounts/{accountId}/avatar", async () => {
      const email = faker.internet.email()
      const cookie = await authenticate(app, email)
      const accounts = app.get(DataSource).getRepository(Account)
      const before = await accounts.findOneByOrFail({
        email: email.toLowerCase(),
      })

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .attach("file", jpegOfSize(2_048), {
          filename: "avatar.jpg",
          contentType: "image/jpeg",
        })
        .expect(FOUND)

      const after = await accounts.findOneByOrFail({
        email: email.toLowerCase(),
      })
      expect(after.avatar).toMatchObject({
        key: `accounts/${before.id}/avatar`,
        mimeType: "image/jpeg",
      })

      const storage = app.get(StorageService)
      const signedUrl = await storage.getSignedUrl(after.avatar!.key)
      const body = await fetchSignedUrl(signedUrl)
      expect(body.length).toBe(2_048)
    })
  })

  describe("When the upload happens and the avatar is read back", () => {
    it(`should respond to GET /profile/avatar with HTTP ${FOUND} pointing at a presigned URL`, async () => {
      const cookie = await authenticate(app, faker.internet.email())

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .attach("file", tinyPngBuffer(), {
          filename: "avatar.png",
          contentType: "image/png",
        })
        .expect(FOUND)

      const getResponse = await request(app.getHttpServer())
        .get("/profile/avatar")
        .set("Cookie", cookie)
        .expect(FOUND)

      expect(getResponse.headers.location).not.toBe("/img/default-avatar.svg")
      expect(getResponse.headers.location).toMatch(/^https?:\/\//)
    })
  })

  describe("When the user uploads a second image", () => {
    it("should overwrite the object at the same per-account key", async () => {
      const cookie = await authenticate(app, faker.internet.email())
      const firstContents = jpegOfSize(1_024)
      const secondContents = jpegOfSize(4_096)

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .attach("file", firstContents, {
          filename: "first.jpg",
          contentType: "image/jpeg",
        })
        .expect(FOUND)

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .attach("file", secondContents, {
          filename: "second.jpg",
          contentType: "image/jpeg",
        })
        .expect(FOUND)

      const getResponse = await request(app.getHttpServer())
        .get("/profile/avatar")
        .set("Cookie", cookie)
        .expect(FOUND)

      const body = await fetchSignedUrl(getResponse.headers.location as string)
      expect(body.length).toBe(secondContents.length)
    })
  })

  describe("When the uploaded file exceeds the 1MB size limit", () => {
    it(`should respond with HTTP ${PAYLOAD_TOO_LARGE}`, async () => {
      const cookie = await authenticate(app, faker.internet.email())

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .attach("file", jpegOfSize(1_000_001), {
          filename: "huge.jpg",
          contentType: "image/jpeg",
        })
        .expect(PAYLOAD_TOO_LARGE)
    })
  })

  describe("When the uploaded file is not an allowed MIME type", () => {
    it(`should respond with HTTP ${UNSUPPORTED_MEDIA_TYPE}`, async () => {
      const cookie = await authenticate(app, faker.internet.email())

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .attach("file", Buffer.from("%PDF-1.4 fake pdf"), {
          filename: "doc.pdf",
          contentType: "application/pdf",
        })
        .expect(UNSUPPORTED_MEDIA_TYPE)
    })

    it("should re-render the profile page with an inline error when the request accepts HTML", async () => {
      const cookie = await authenticate(app, faker.internet.email())

      const response = await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .attach("file", Buffer.from("%PDF-1.4 fake pdf"), {
          filename: "doc.pdf",
          contentType: "application/pdf",
        })
        .expect(UNSUPPORTED_MEDIA_TYPE)
        .expect("Content-Type", /text\/html/)

      expect(response.text).toContain("Profile")
      expect(response.text).toContain("not supported")
      expect(response.text).toContain('name="file"')
    })
  })

  describe("When no file is attached to the upload request", () => {
    it(`should respond with HTTP ${BAD_REQUEST}`, async () => {
      const cookie = await authenticate(app, faker.internet.email())

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .expect(BAD_REQUEST)
    })
  })

  describe("When the request is not authenticated", () => {
    it(`should respond with HTTP ${UNAUTHORIZED}`, async () => {
      await request(app.getHttpServer())
        .post("/profile/avatar")
        .attach("file", tinyPngBuffer(), {
          filename: "avatar.png",
          contentType: "image/png",
        })
        .expect(UNAUTHORIZED)
    })
  })
})
