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
  describe("RESOLVED_STORAGE_OPTIONS", () => {
    describe("Given forRootAsync without defaults", () => {
      it("should materialise connection fields and default defaults to {}", async () => {
        const connection = baseConnection()

        const module = await Test.createTestingModule({
          imports: [
            ManagedDatabaseModule.forRoot([TestStorable]),
            StorageModule.forRootAsync({
              useFactory: () => connection,
            }),
            StorageModule.forFeatureAsync({
              useFactory: () => ({ bucket: faker.string.alphanumeric(10) }),
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

    describe("Given forRootAsync with defaults", () => {
      it("should preserve the nested defaults block", async () => {
        const maxFileSize = faker.number.int({ min: 1024, max: 10_000_000 })
        const linkCacheControl = `public, max-age=${faker.number.int({ min: 60, max: 3600 })}`
        const connection = baseConnection()

        const module = await Test.createTestingModule({
          imports: [
            ManagedDatabaseModule.forRoot([TestStorable]),
            StorageModule.forRootAsync({
              useFactory: () => ({
                ...connection,
                defaults: { maxFileSize, linkCacheControl },
              }),
            }),
            StorageModule.forFeatureAsync({
              useFactory: () => ({ bucket: faker.string.alphanumeric(10) }),
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
    describe("Given no root defaults and a minimal forFeatureAsync", () => {
      it("should apply package-level fallbacks for unspecified fields", async () => {
        const bucket = faker.string.alphanumeric(10)

        const module = await Test.createTestingModule({
          imports: [
            ManagedDatabaseModule.forRoot([TestStorable]),
            StorageModule.forRootAsync({
              useFactory: () => baseConnection(),
            }),
            StorageModule.forFeatureAsync({
              useFactory: () => ({ bucket }),
            }),
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

    describe("Given root defaults and a minimal forFeatureAsync", () => {
      it("should flow root defaults into the feature when not overridden", async () => {
        const bucket = faker.string.alphanumeric(10)
        const maxFileSize = faker.number.int({ min: 1024, max: 10_000_000 })
        const allowedMimeTypes = ["image/png"]

        const module = await Test.createTestingModule({
          imports: [
            ManagedDatabaseModule.forRoot([TestStorable]),
            StorageModule.forRootAsync({
              useFactory: () => ({
                ...baseConnection(),
                defaults: { maxFileSize, allowedMimeTypes },
              }),
            }),
            StorageModule.forFeatureAsync({
              useFactory: () => ({ bucket }),
            }),
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

    describe("Given root defaults and a forFeatureAsync override", () => {
      it("should let the feature win over root defaults", async () => {
        const bucket = faker.string.alphanumeric(10)
        const rootMaxFileSize = faker.number.int({ min: 1024, max: 5000 })
        const featureMaxFileSize = faker.number.int({ min: 5001, max: 10_000 })

        const module = await Test.createTestingModule({
          imports: [
            ManagedDatabaseModule.forRoot([TestStorable]),
            StorageModule.forRootAsync({
              useFactory: () => ({
                ...baseConnection(),
                defaults: { maxFileSize: rootMaxFileSize },
              }),
            }),
            StorageModule.forFeatureAsync({
              useFactory: () => ({
                bucket,
                maxFileSize: featureMaxFileSize,
              }),
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

  describe("multi-feature isolation", () => {
    it("should resolve a distinct bucket per consumer app", async () => {
      const bucketA = faker.string.alphanumeric(10)
      const bucketB = faker.string.alphanumeric(10)

      const moduleA = await Test.createTestingModule({
        imports: [
          ManagedDatabaseModule.forRoot([TestStorable]),
          StorageModule.forRootAsync({ useFactory: () => baseConnection() }),
          StorageModule.forFeatureAsync({
            useFactory: () => ({ bucket: bucketA }),
          }),
        ],
      }).compile()

      const moduleB = await Test.createTestingModule({
        imports: [
          ManagedDatabaseModule.forRoot([TestStorable]),
          StorageModule.forRootAsync({ useFactory: () => baseConnection() }),
          StorageModule.forFeatureAsync({
            useFactory: () => ({ bucket: bucketB }),
          }),
        ],
      }).compile()

      const resolvedA = moduleA.get<ResolvedFeatureStorageOptions>(
        RESOLVED_FEATURE_STORAGE_OPTIONS,
      )
      const resolvedB = moduleB.get<ResolvedFeatureStorageOptions>(
        RESOLVED_FEATURE_STORAGE_OPTIONS,
      )

      expect(resolvedA.bucket).toBe(bucketA)
      expect(resolvedB.bucket).toBe(bucketB)
    })
  })
})
