import { faker } from "@faker-js/faker"
import { ManagedDatabaseModule } from "@neomaventures/managed-database"
import { Test } from "@nestjs/testing"

import { TestStorable } from "../fixtures/entities/test-storable.entity"

import { StorageModule } from "./storage.module"
import {
  type ResolvedFeatureStorageOptions,
  type ResolvedStorageRootOptions,
  type StorageRootOptions,
  DEFAULT_LINK_EXPIRES_IN,
  RESOLVED_FEATURE_STORAGE_OPTIONS,
  RESOLVED_STORAGE_OPTIONS,
} from "./storage.options"

const baseConnection = (): Omit<StorageRootOptions, "defaults"> => ({
  endpoint: faker.internet.url(),
  region: faker.location.countryCode(),
  accessKeyId: faker.string.alphanumeric(20),
  secretAccessKey: faker.string.alphanumeric(40),
  entity: TestStorable,
})

describe("StorageModule", () => {
  describe("forRoot + forFeature", () => {
    it("should compile the module", async () => {
      const module = await Test.createTestingModule({
        imports: [
          ManagedDatabaseModule.forRoot([TestStorable]),
          StorageModule.forRoot(baseConnection()),
          StorageModule.forFeature({ bucket: faker.string.alphanumeric(10) }),
        ],
      }).compile()

      expect(module).toBeDefined()
    })
  })

  describe("forRootAsync + forFeatureAsync", () => {
    it("should compile the module", async () => {
      const rootOptions = baseConnection()
      const featureOptions = { bucket: faker.string.alphanumeric(10) }

      const module = await Test.createTestingModule({
        imports: [
          ManagedDatabaseModule.forRoot([TestStorable]),
          StorageModule.forRootAsync({
            useFactory: () => rootOptions,
          }),
          StorageModule.forFeatureAsync({
            useFactory: () => featureOptions,
          }),
        ],
      }).compile()

      expect(module).toBeDefined()
    })
  })

  describe("RESOLVED_STORAGE_OPTIONS", () => {
    describe("Given forRoot without defaults", () => {
      it("should materialise connection fields and default defaults to {}", async () => {
        const connection = baseConnection()

        const module = await Test.createTestingModule({
          imports: [
            ManagedDatabaseModule.forRoot([TestStorable]),
            StorageModule.forRoot(connection),
            StorageModule.forFeature({
              bucket: faker.string.alphanumeric(10),
            }),
          ],
        }).compile()

        const resolved = module.get<ResolvedStorageRootOptions>(
          RESOLVED_STORAGE_OPTIONS,
        )

        expect(resolved.endpoint).toBe(connection.endpoint)
        expect(resolved.region).toBe(connection.region)
        expect(resolved.entity).toBe(TestStorable)
        expect(resolved.defaults).toEqual({})
      })
    })

    describe("Given forRoot with defaults", () => {
      it("should preserve the nested defaults block", async () => {
        const maxFileSize = faker.number.int({ min: 1024, max: 10_000_000 })
        const linkCacheControl = `public, max-age=${faker.number.int({ min: 60, max: 3600 })}`
        const connection = baseConnection()

        const module = await Test.createTestingModule({
          imports: [
            ManagedDatabaseModule.forRoot([TestStorable]),
            StorageModule.forRoot({
              ...connection,
              defaults: { maxFileSize, linkCacheControl },
            }),
            StorageModule.forFeature({
              bucket: faker.string.alphanumeric(10),
            }),
          ],
        }).compile()

        const resolved = module.get<ResolvedStorageRootOptions>(
          RESOLVED_STORAGE_OPTIONS,
        )

        expect(resolved.defaults).toEqual({ maxFileSize, linkCacheControl })
      })
    })
  })

  describe("RESOLVED_FEATURE_STORAGE_OPTIONS", () => {
    describe("Given no root defaults and a minimal forFeature", () => {
      it("should apply package-level fallbacks for unspecified fields", async () => {
        const bucket = faker.string.alphanumeric(10)

        const module = await Test.createTestingModule({
          imports: [
            ManagedDatabaseModule.forRoot([TestStorable]),
            StorageModule.forRoot(baseConnection()),
            StorageModule.forFeature({ bucket }),
          ],
        }).compile()

        const resolved = module.get<ResolvedFeatureStorageOptions>(
          RESOLVED_FEATURE_STORAGE_OPTIONS,
        )

        expect(resolved.bucket).toBe(bucket)
        expect(resolved.linkExpiresIn).toBe(DEFAULT_LINK_EXPIRES_IN)
        expect(resolved.maxFileSize).toBeUndefined()
        expect(resolved.allowedMimeTypes).toBeUndefined()
        expect(resolved.linkCacheControl).toBeUndefined()
      })
    })

    describe("Given root defaults and a minimal forFeature", () => {
      it("should flow root defaults into the feature when not overridden", async () => {
        const bucket = faker.string.alphanumeric(10)
        const maxFileSize = faker.number.int({ min: 1024, max: 10_000_000 })
        const allowedMimeTypes = ["image/png"]

        const module = await Test.createTestingModule({
          imports: [
            ManagedDatabaseModule.forRoot([TestStorable]),
            StorageModule.forRoot({
              ...baseConnection(),
              defaults: { maxFileSize, allowedMimeTypes },
            }),
            StorageModule.forFeature({ bucket }),
          ],
        }).compile()

        const resolved = module.get<ResolvedFeatureStorageOptions>(
          RESOLVED_FEATURE_STORAGE_OPTIONS,
        )

        expect(resolved.bucket).toBe(bucket)
        expect(resolved.maxFileSize).toBe(maxFileSize)
        expect(resolved.allowedMimeTypes).toEqual(allowedMimeTypes)
      })
    })

    describe("Given root defaults and a forFeature override", () => {
      it("should let the feature win over root defaults", async () => {
        const bucket = faker.string.alphanumeric(10)
        const rootMaxFileSize = faker.number.int({ min: 1024, max: 5000 })
        const featureMaxFileSize = faker.number.int({ min: 5001, max: 10_000 })

        const module = await Test.createTestingModule({
          imports: [
            ManagedDatabaseModule.forRoot([TestStorable]),
            StorageModule.forRoot({
              ...baseConnection(),
              defaults: { maxFileSize: rootMaxFileSize },
            }),
            StorageModule.forFeature({
              bucket,
              maxFileSize: featureMaxFileSize,
            }),
          ],
        }).compile()

        const resolved = module.get<ResolvedFeatureStorageOptions>(
          RESOLVED_FEATURE_STORAGE_OPTIONS,
        )

        expect(resolved.maxFileSize).toBe(featureMaxFileSize)
      })
    })
  })

  // Group C (multi-feature isolation) skipped: NestJS testing-module DI
  // scope makes resolving two distinct DynamicModule instances of
  // StorageFeatureModule fiddly — `module.select(ConsumerModule)` doesn't
  // see the feature providers (they live in the imported feature module's
  // own scope, not re-exported into the consumer). Tracked as a gap for a
  // follow-up that compiles two separate testing modules and asserts the
  // resolved bucket on each independently.
})
