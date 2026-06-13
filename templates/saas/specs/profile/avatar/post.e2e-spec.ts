import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { authenticate } from "~fixtures/auth/e2e"
import { configureViewEngine } from "~fixtures/configure-view-engine"

const {
  BAD_REQUEST,
  FOUND,
  NOT_FOUND,
  PAYLOAD_TOO_LARGE,
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

describe("POST /profile/avatar", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({ configure: configureViewEngine })
  })

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

    // One thorough check that an upload validation error from the storage
    // package round-trips through `@ErrorTemplate` to the profile view with
    // an inline error message. The other error cases (size, missing file)
    // share the same exception filter wiring; asserting status on those is
    // enough — repeating the template check would be redundant.
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
    it("should respond with 404 — asset endpoints do not confirm resource existence", () => {
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
      expect(before.equals(after)).toBe(false)
    })
  })
})
