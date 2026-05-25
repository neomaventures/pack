import {
  ConfigModule,
  ConfigService,
  InjectConfig,
  TypedConfig,
} from "@neoma/config"
import { Controller, Module } from "@nestjs/common"
import { Test } from "@nestjs/testing"

describe("ConfigModule", () => {
  describe("forRoot()", () => {
    it("should return a global dynamic module", () => {
      const module = ConfigModule.forRoot()
      expect(module).toHaveProperty("global", true)
    })
  })

  describe("global registration", () => {
    it("should make ConfigService available to child modules that do not import ConfigModule", async () => {
      @Controller()
      class ChildController {
        public constructor(
          @InjectConfig()
          public config: TypedConfig<{ testVar: string }>,
        ) {}
      }

      @Module({
        controllers: [ChildController],
      })
      class ChildModule {}

      const module = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(), ChildModule],
      }).compile()

      const controller = module.get(ChildController)
      expect(controller.config).toBeInstanceOf(ConfigService)
    })

    it("should not provide ConfigService when using plain ConfigModule", async () => {
      @Controller()
      class ChildController {
        public constructor(
          @InjectConfig()
          public config: TypedConfig<{ testVar: string }>,
        ) {}
      }

      await expect(
        Test.createTestingModule({
          imports: [ConfigModule],
          controllers: [ChildController],
        }).compile(),
      ).rejects.toThrow(/Nest can't resolve dependencies/)
    })
  })

  describe("@InjectConfig decorator", () => {
    it("should inject ConfigService into controller constructor", async () => {
      @Controller()
      class TestController {
        public constructor(
          @InjectConfig()
          public config: TypedConfig<{ testVar: string }>,
        ) {}
      }

      const module = await Test.createTestingModule({
        imports: [ConfigModule.forRoot()],
        controllers: [TestController],
      }).compile()

      const controller = module.get(TestController)
      const configService = module.get(ConfigService)

      expect(controller.config).toBe(configService)
      expect(controller.config).toBeInstanceOf(ConfigService)
    })
  })
})
