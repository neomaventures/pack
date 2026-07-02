import { readFileSync } from "fs"
import { join } from "path"

import { faker } from "@faker-js/faker"
import { Account } from "@neomaventures/auth"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import ejs from "ejs"
import request from "supertest"
import { DataSource } from "typeorm"

import { authenticate } from "~fixtures/auth/e2e"
import { configureViewEngine } from "~fixtures/configure-view-engine"
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const {
  BAD_REQUEST,
  FOUND,
  NOT_FOUND,
  PAYLOAD_TOO_LARGE,
  UNSUPPORTED_MEDIA_TYPE,
} = HttpStatus

const profileTemplatePath = join(process.cwd(), "views", "profile.ejs")
const profileTemplate = readFileSync(profileTemplatePath, "utf-8")

/**
 * Per-route upload limit configured on `@Upload({ maxSize })` in
 * {@link ProfileController.uploadAvatar}. Mirrored here so the rendered
 * error message matches what the controller's `FileTooLargeException`
 * carries.
 */
const AVATAR_MAX_SIZE = 3_000_000

/**
 * Per-route allowed MIME types from `@Upload({ types })` on
 * {@link ProfileController.uploadAvatar}. Mirrored here so the rendered
 * `UnsupportedFileTypeException` message matches the controller's.
 */
const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

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

describe("POST /profile/avatar", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({ configure: configureViewEngine })
  })

  const loadAccount = async (email: string): Promise<Account> =>
    app
      .get(DataSource)
      .getRepository(Account)
      .findOneOrFail({ where: { email: email.toLowerCase() } })

  describe("When an authenticated user uploads a valid JPEG under the size limit", () => {
    it("should redirect to /profile", async () => {
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
  })

  describe("When the uploaded file exceeds the configured size limit", () => {
    it(`should respond with HTTP ${PAYLOAD_TOO_LARGE}`, async () => {
      const cookie = await authenticate(app, faker.internet.email())

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .attach("file", jpegOfSize(3_000_001), {
          filename: "huge.jpg",
          contentType: "image/jpeg",
        })
        .expect(PAYLOAD_TOO_LARGE)
    })

    it("should re-render the profile page with an inline error message", async () => {
      const email = faker.internet.email()
      const cookie = await authenticate(app, email)
      const oversizeBytes = AVATAR_MAX_SIZE + 1
      const account = await loadAccount(email)

      const expectedHtml = ejs.render(
        profileTemplate,
        {
          npmPackageName,
          npmPackageVersion,
          account,
          exception: {
            statusCode: PAYLOAD_TOO_LARGE,
            message: `File size ${oversizeBytes} bytes exceeds the maximum allowed size of ${AVATAR_MAX_SIZE} bytes.`,
            fileSize: oversizeBytes,
            maxSize: AVATAR_MAX_SIZE,
            error: "Payload Too Large",
          },
        },
        { filename: profileTemplatePath },
      )

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .attach("file", jpegOfSize(oversizeBytes), {
          filename: "huge.jpg",
          contentType: "image/jpeg",
        })
        .expect(PAYLOAD_TOO_LARGE)
        .expect("Content-Type", /text\/html/)
        .expect(expectedHtml)
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

    it("should re-render the profile page with an inline error message", async () => {
      const email = faker.internet.email()
      const cookie = await authenticate(app, email)
      const rejectedMimeType = "application/pdf"
      const account = await loadAccount(email)

      const expectedHtml = ejs.render(
        profileTemplate,
        {
          npmPackageName,
          npmPackageVersion,
          account,
          exception: {
            statusCode: UNSUPPORTED_MEDIA_TYPE,
            message: `File type "${rejectedMimeType}" is not supported. Allowed types: ${AVATAR_ALLOWED_TYPES.join(", ")}.`,
            mimeType: rejectedMimeType,
            allowedTypes: AVATAR_ALLOWED_TYPES,
            error: "Unsupported Media Type",
          },
        },
        { filename: profileTemplatePath },
      )

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .attach("file", Buffer.from("%PDF-1.4 fake pdf"), {
          filename: "doc.pdf",
          contentType: rejectedMimeType,
        })
        .expect(UNSUPPORTED_MEDIA_TYPE)
        .expect("Content-Type", /text\/html/)
        .expect(expectedHtml)
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

    it("should re-render the profile page with an inline error message", async () => {
      const email = faker.internet.email()
      const cookie = await authenticate(app, email)
      const account = await loadAccount(email)

      const expectedHtml = ejs.render(
        profileTemplate,
        {
          npmPackageName,
          npmPackageVersion,
          account,
          exception: {
            statusCode: BAD_REQUEST,
            message: "No file was provided in the request.",
            error: "Bad Request",
          },
        },
        { filename: profileTemplatePath },
      )

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(BAD_REQUEST)
        .expect("Content-Type", /text\/html/)
        .expect(expectedHtml)
    })
  })

  describe("When the request is not authenticated", () => {
    it("should respond with HTTP 404", () => {
      return request(app.getHttpServer())
        .post("/profile/avatar")
        .attach("file", tinyPngBuffer(), {
          filename: "avatar.png",
          contentType: "image/png",
        })
        .expect(NOT_FOUND)
    })
  })

  describe("When an authenticated user uploads a second avatar", () => {
    it("should change the bytes served at /profile/avatar to the new image", async () => {
      const cookie = await authenticate(app, faker.internet.email())
      const first = jpegOfSize(1_024)
      const second = jpegOfSize(4_096)

      const fetchAvatarBytes = async (): Promise<Buffer> => {
        const redirect = await request(app.getHttpServer())
          .get("/profile/avatar")
          .set("Cookie", cookie)
          .expect(FOUND)
        const url = redirect.headers.location as string
        const response = await fetch(url)
        return Buffer.from(await response.arrayBuffer())
      }

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .attach("file", first, {
          filename: "first.jpg",
          contentType: "image/jpeg",
        })
        .expect(FOUND)
      const before = await fetchAvatarBytes()

      await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookie)
        .attach("file", second, {
          filename: "second.jpg",
          contentType: "image/jpeg",
        })
        .expect(FOUND)
      const after = await fetchAvatarBytes()

      expect(before.equals(first)).toBe(true)
      expect(after.equals(second)).toBe(true)
    })
  })
})
