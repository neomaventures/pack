import { S3Client } from "@aws-sdk/client-s3"
import { faker } from "@faker-js/faker"
import { Test, type TestingModule } from "@nestjs/testing"

import { TestStorable } from "../../fixtures/entities/test-storable.entity"
import { type StorageRootOptions, STORAGE_OPTIONS } from "../storage.options"

import { S3_CLIENT, S3ClientProvider } from "./s3-client.provider"

describe("S3ClientProvider", () => {
  const options: StorageRootOptions = {
    endpoint: faker.internet.url(),
    region: faker.helpers.arrayElement([
      "us-east-1",
      "eu-west-1",
      "ap-southeast-2",
    ]),
    accessKeyId: faker.string.alphanumeric(20),
    secretAccessKey: faker.string.alphanumeric(40),
    forcePathStyle: true,
    entity: TestStorable,
  }

  let module: TestingModule

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        { provide: STORAGE_OPTIONS, useValue: options },
        S3ClientProvider,
      ],
    }).compile()
  })

  describe("Given the provider is resolved", () => {
    it("should return a non-null S3Client instance", () => {
      const client = module.get<S3Client>(S3_CLIENT)

      expect(client).toBeDefined()
      expect(client).toBeInstanceOf(S3Client)
    })
  })

  describe("Given the provider is resolved multiple times", () => {
    it("should return the same S3Client instance (singleton scope)", () => {
      const first = module.get<S3Client>(S3_CLIENT)
      const second = module.get<S3Client>(S3_CLIENT)

      expect(first).toBe(second)
    })
  })

  describe("Given specific storage options", () => {
    it("should construct the client with the configured region", async () => {
      const client = module.get<S3Client>(S3_CLIENT)

      const region = await client.config.region()
      expect(region).toEqual(options.region)
    })

    it("should construct the client with the configured credentials", async () => {
      const client = module.get<S3Client>(S3_CLIENT)

      const credentials = await client.config.credentials()
      expect(credentials).toMatchObject({
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      })
    })

    it("should construct the client with forcePathStyle from options", () => {
      const client = module.get<S3Client>(S3_CLIENT)

      expect(client.config.forcePathStyle).toBe(true)
    })

    it("should default forcePathStyle to true when omitted", async () => {
      const localModule = await Test.createTestingModule({
        providers: [
          {
            provide: STORAGE_OPTIONS,
            useValue: { ...options, forcePathStyle: undefined },
          },
          S3ClientProvider,
        ],
      }).compile()

      const client = localModule.get<S3Client>(S3_CLIENT)

      expect(client.config.forcePathStyle).toBe(true)
    })
  })
})
