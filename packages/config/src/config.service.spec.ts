import { faker } from "@faker-js/faker"
import {
  ConfigModule,
  ConfigService,
  type TypedConfig,
} from "@neomaventures/config"
import { Test, type TestingModule } from "@nestjs/testing"
import "fixtures/env"

// Test data for property access
const value = faker.lorem.word()
const screamingSnake = faker.lorem.word()
const screamingSnakeCase = faker.lorem.word()
const apiUrl = faker.internet.url()
const nullEnv = "null"
const undefinedEnv = "undefined"
const trueEnv = "true"
const falseEnv = "false"
const envInt = faker.number.int().toString()
const envFloat = faker.number.float().toString()
const envHex = `0x${faker.number.hex({ min: 100, max: 1000 })}`
const envOctal = `0o${faker.number.octal({ min: 100, max: 1000 })}`
const envBinary = `0b${faker.number.binary({ min: 100, max: 1000 })}`
const envScientific = faker.number.int().toExponential()
const envNan = "NaN"
const envInfinity = "Infinity"
const envLeadingZero = "007"
const envLeadingTrailingWhitespace = " 123 "
const envWhitespaceOnly = "   "
const envEmpty = ""
const envDecimal = "0.123"

// Test data for case-insensitive fallback
const snakeCaseKey = `snake_case_test_${faker.lorem.word()}`
const snakeCaseValue = faker.lorem.word()
const uppercaseValue = faker.lorem.word()
const snakeCaseInt = faker.number.int().toString()
const snakeCaseBool = "true"

// Test data for env loading
const environment = faker.lorem.word()
process.env.NODE_ENV = environment
const originalEnv = { ...process.env }

const port = "3000" // From process.env.PORT - Highest precedence
const databaseConnection = "postgres-node_env-local" // From .env.{environment}.local
const databaseUrl = "postgres://user:password@host:5432/local" // From .env.local
const appBuild = "build-node_env" // From .env.{environment}
const appName = "config-env" // From .env

const modules = [
  { title: "ConfigModule.forRoot()", module: ConfigModule.forRoot() },
  {
    title:
      "ConfigModule.forRoot({ loadEnv: false, strict: false, coerce: false })",
    module: ConfigModule.forRoot({
      loadEnv: false,
      strict: false,
      coerce: false,
    }),
  },
]

describe("ConfigService", () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.VARIABLE = value
    process.env.SCREAMING_SNAKE = screamingSnake
    process.env.SCREAMING_SNAKE_CASE = screamingSnakeCase
    process.env.API_URL = apiUrl
    process.env.NULL_ENV = nullEnv
    process.env.UNDEFINED_ENV = undefinedEnv
    process.env.TRUE_ENV = trueEnv
    process.env.FALSE_ENV = falseEnv
    process.env.ENV_INT = envInt
    process.env.ENV_FLOAT = envFloat
    process.env.ENV_HEX = envHex
    process.env.ENV_OCTAL = envOctal
    process.env.ENV_BINARY = envBinary
    process.env.ENV_SCIENTIFIC = envScientific
    process.env.ENV_NAN = envNan
    process.env.ENV_INFINITY = envInfinity
    process.env.ENV_LEADING_ZERO = envLeadingZero
    process.env.ENV_LEADING_TRAILING_WHITESPACE = envLeadingTrailingWhitespace
    process.env.ENV_WHITESPACE_ONLY = envWhitespaceOnly
    process.env.ENV_EMPTY = envEmpty
    process.env.ENV_DECIMAL = envDecimal
    process.env[snakeCaseKey] = snakeCaseValue
    process.env.snake_case_int = snakeCaseInt
    process.env.snake_case_bool = snakeCaseBool
  })

  describe("property access", () => {
    modules.forEach(({ title, module }) => {
      describe(title, () => {
        let config: TypedConfig<{ [key: string]: string }>

        beforeEach(async () => {
          const app: TestingModule = await Test.createTestingModule({
            imports: [module],
          }).compile()

          await app.init()

          config = app.get(ConfigService)
        })

        describe("property access", () => {
          it(`'variable' should return ${value} from process.env.VARIABLE`, () => {
            expect(config.variable).toBe(value)
          })

          it(`Checking for the existence of 'variable' should return true when process.env.VARIABLE is set`, () => {
            expect("variable" in config).toBeTrue()
          })

          it(`'screamingSnake' should return ${screamingSnake} from process.env.SCREAMING_SNAKE`, () => {
            expect(config.screamingSnake).toBe(screamingSnake)
          })

          it(`'screamingSnakeCase' should return ${screamingSnakeCase} from process.env.SCREAMING_SNAKE_CASE`, () => {
            expect(config.screamingSnakeCase).toBe(screamingSnakeCase)
          })

          it(`'apiUrl' should return ${apiUrl} from process.env.API_URL`, () => {
            expect(config.apiUrl).toBe(apiUrl)
          })

          it(`'apiURL' should return ${apiUrl} from process.env.API_URL`, () => {
            expect(config.apiURL).toBe(apiUrl)
          })

          it(`'api_url' should return ${apiUrl} from process.env.API_URL`, () => {
            expect(config.api_url).toBe(apiUrl)
          })

          it(`'APIUrl' should return ${apiUrl} from process.env.API_URL`, () => {
            expect(config.APIUrl).toBe(apiUrl)
          })

          it(`'nullEnv' should return string 'null' when process.env.NULL_ENV is set to 'null'`, () => {
            expect(config.nullEnv).toBe("null")
          })

          it(`'undefinedEnv' should return string 'undefined' when process.env.UNDEFINED_ENV is set to 'undefined'`, () => {
            expect(config.undefinedEnv).toBe("undefined")
          })

          it(`'trueEnv' should return string 'true' when process.env.TRUE_ENV is set to 'true'`, () => {
            expect(config.trueEnv).toBe("true")
          })

          it(`'falseEnv' should return string 'false' when process.env.FALSE_ENV is set to 'false'`, () => {
            expect(config.falseEnv).toBe("false")
          })

          it(`'envInt' should return string '${envInt}' when process.env.ENV_INT is set to '${envInt}'`, () => {
            expect(config.envInt).toBe(envInt)
          })

          it(`'envFloat' should return string '${envFloat}' when process.env.ENV_FLOAT is set to '${envFloat}'`, () => {
            expect(config.envFloat).toBe(envFloat)
          })

          it(`'envHex' should return string '${envHex}' when process.env.ENV_HEX is set to '${envHex}'`, () => {
            expect(config.envHex).toBe(envHex)
          })

          it(`'envOctal' should return string '${envOctal}' when process.env.ENV_OCTAL is set to '${envOctal}'`, () => {
            expect(config.envOctal).toBe(envOctal)
          })

          it(`'envBinary' should return string '${envBinary}' when process.env.ENV_BINARY is set to '${envBinary}'`, () => {
            expect(config.envBinary).toBe(envBinary)
          })

          it(`'envScientific' should return string '${envScientific}' when process.env.ENV_SCIENTIFIC is set to '${envScientific}'`, () => {
            expect(config.envScientific).toBe(envScientific)
          })

          it(`'envNan' should return string 'NaN' when process.env.ENV_NAN is set to 'NaN'`, () => {
            expect(config.envNan).toBe("NaN")
          })

          it(`'envInfinity' should return string 'Infinity' when process.env.ENV_INFINITY is set to 'Infinity'`, () => {
            expect(config.envInfinity).toBe("Infinity")
          })

          it(`'envLeadingZero' should return string '${envLeadingZero}' when process.env.ENV_LEADING_ZERO is set to '${envLeadingZero}'`, () => {
            expect(config.envLeadingZero).toBe(envLeadingZero)
          })

          it(`'envLeadingTrailingWhitespace' should return string '${envLeadingTrailingWhitespace}' when process.env.ENV_LEADING_TRAILING_WHITESPACE is set to '${envLeadingTrailingWhitespace}'`, () => {
            expect(config.envLeadingTrailingWhitespace).toBe(
              envLeadingTrailingWhitespace,
            )
          })

          it(`'envEmpty' should return string '' when process.env.ENV_EMPTY is set to ''`, () => {
            expect(config.envEmpty).toBe("")
          })

          it(`'envDecimal' should return string '${envDecimal}' when process.env.ENV_DECIMAL is set to '${envDecimal}'`, () => {
            expect(config.envDecimal).toBe(envDecimal)
          })

          it("'notDefined' should return undefined when process.env.NOT_DEFINED is not set", () => {
            expect(config.notDefined).toBeUndefined()
          })

          it("Checking for the existence of 'notDefined' should return false when neither case is set", () => {
            expect("notDefined" in config).toBeFalse()
          })
        })

        describe("case-insensitive fallback", () => {
          it(`'${snakeCaseKey}' should return value from lowercase env var when uppercase is not set`, () => {
            expect(config[snakeCaseKey]).toBe(snakeCaseValue)
          })

          it(`Checking for the existence of '${snakeCaseKey}' should return true when only lowercase is set`, () => {
            expect(snakeCaseKey in config).toBeTrue()
          })

          it("uppercase takes precedence when both exist", () => {
            process.env[snakeCaseKey.toUpperCase()] = uppercaseValue
            expect(config[snakeCaseKey]).toBe(uppercaseValue)
          })
        })
      })
    })
  })

  describe("ConfigModule.forRoot({ strict: true })", () => {
    const definedKey = faker.lorem.word()
    const definedValue = faker.lorem.word()
    const notDefinedKey = faker.lorem.word()

    describe("property access", () => {
      let config: TypedConfig<{ [key: string]: string }>

      beforeEach(async () => {
        process.env[definedKey.toUpperCase()] = definedValue

        const app: TestingModule = await Test.createTestingModule({
          imports: [ConfigModule.forRoot({ strict: true })],
        }).compile()

        await app.init()

        config = app.get(ConfigService)
      })

      it(`'${definedKey}' should return ${definedValue} when process.env.${definedKey.toUpperCase()} is set`, () => {
        expect(config[definedKey]).toBe(definedValue)
      })

      it(`'${notDefinedKey}' should throw an error when process.env.${notDefinedKey.toUpperCase()} is not set`, () => {
        expect(() => config[notDefinedKey]).toThrow(
          `Strict mode error when accessing configuration property '${notDefinedKey}'. ${notDefinedKey.toUpperCase()} is not defined on process.env`,
        )
      })

      it(`Checking for the existence of '${notDefinedKey}' should return false when process.env.${notDefinedKey.toUpperCase()} is not set`, () => {
        expect(notDefinedKey in config).toBeFalse()
      })

      it("should not throw when only the lowercase env var is set", () => {
        const lcKey = faker.lorem.word()
        const lcValue = faker.lorem.word()
        process.env[lcKey] = lcValue
        expect(config[lcKey]).toBe(lcValue)
      })
    })
  })

  describe("ConfigModule.forRoot({ loadEnv: true })", () => {
    describe(`Given process.env.NODE_ENV=${environment}`, () => {
      let config: TypedConfig<{ [key: string]: string }>

      beforeEach(async () => {
        process.env.PORT = port

        const app: TestingModule = await Test.createTestingModule({
          imports: [ConfigModule.forRoot({ loadEnv: true })],
        }).compile()

        await app.init()

        config = app.get(ConfigService)
      })

      it(`should automatically load configuration including env files in precedence order: process.env, .env.${environment}.local, .env.local, .env.${environment}, and .env`, () => {
        expect(config.port).toBe(port)
        expect(config.databaseConnection).toBe(databaseConnection)
        expect(config.databaseUrl).toBe(databaseUrl)
        expect(config.appBuild).toBe(appBuild)
        expect(config.appName).toBe(appName)
      })
    })
  })

  describe("ConfigModule.forRoot({ coerce: true })", () => {
    let config: TypedConfig<{
      [key: string]: string | number | boolean | null | undefined
    }>

    beforeEach(async () => {
      process.env.PORT = port

      const app: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ coerce: true })],
      }).compile()

      await app.init()

      config = app.get(ConfigService)
    })

    it("it should not coerce normal string values", () => {
      expect(config.variable).toBe(value)
    })

    it("it should coerce 'null' into null", () => {
      expect(config.nullEnv).toBeNull()
    })

    it("it should coerce 'undefined' into undefined", () => {
      expect(config.undefinedEnv).toBeUndefined()
    })

    it("it should coerce 'true' to the true boolean value", () => {
      expect(config.trueEnv).toBeTrue()
    })

    it("it should coerce 'false' to the false boolean value", () => {
      expect(config.falseEnv).toBeFalse()
    })

    it(`it should coerce '${envInt}' to ${Number(envInt)}`, () => {
      expect(config.envInt).toBeNumber()
      expect(config.envInt).toEqual(Number(envInt))
    })

    it(`it should coerce '${envFloat}' to ${Number(envFloat)}`, () => {
      expect(config.envFloat).toBeNumber()
      expect(config.envFloat).toEqual(Number(envFloat))
    })

    it(`it should coerce '${envHex}' to ${Number(envHex)}`, () => {
      expect(config.envHex).toBeNumber()
      expect(config.envHex).toEqual(Number(envHex))
    })

    it(`it should coerce '${envOctal}' to ${Number(envOctal)}`, () => {
      expect(config.envOctal).toBeNumber()
      expect(config.envOctal).toEqual(Number(envOctal))
    })

    it(`it should coerce '${envBinary}' to ${Number(envBinary)}`, () => {
      expect(config.envBinary).toBeNumber()
      expect(config.envBinary).toEqual(Number(envBinary))
    })

    it(`it should coerce '${envScientific}' to ${Number(envScientific)}`, () => {
      expect(config.envScientific).toBeNumber()
      expect(config.envScientific).toEqual(Number(envScientific))
    })

    it("it should coerce 'NaN' to NaN", () => {
      expect(config.envNan).toBeNaN()
    })

    it("it should coerce 'Infinity' to Infinity", () => {
      expect(config.envInfinity).toBe(Infinity)
    })

    it(`it should NOT coerce '${envLeadingZero}' and keep it as string (leading zero)`, () => {
      expect(config.envLeadingZero).toBeString()
      expect(config.envLeadingZero).toBe(envLeadingZero)
    })

    it(`it should coerce '${envLeadingTrailingWhitespace}' to ${Number(envLeadingTrailingWhitespace)} (whitespace allowed)`, () => {
      expect(config.envLeadingTrailingWhitespace).toBeNumber()
      expect(config.envLeadingTrailingWhitespace).toEqual(
        Number(envLeadingTrailingWhitespace),
      )
    })

    it("it should NOT coerce empty string and keep it as string", () => {
      expect(config.envEmpty).toBeString()
      expect(config.envEmpty).toBe("")
    })

    it("it should NOT coerce a whitespace-only string to 0 and keep it as string", () => {
      expect(config.envWhitespaceOnly).toBeString()
      expect(config.envWhitespaceOnly).toBe(envWhitespaceOnly)
    })

    it(`it should coerce '${envDecimal}' to ${Number(envDecimal)} (valid decimal)`, () => {
      expect(config.envDecimal).toBeNumber()
      expect(config.envDecimal).toEqual(Number(envDecimal))
    })

    it(`'snakeCaseInt' should coerce snake_case_int fallback '${snakeCaseInt}' to ${Number(snakeCaseInt)}`, () => {
      expect(config.snakeCaseInt).toBeNumber()
      expect(config.snakeCaseInt).toEqual(Number(snakeCaseInt))
    })

    it("'snakeCaseBool' should coerce snake_case_bool fallback 'true' to the true boolean value", () => {
      expect(config.snakeCaseBool).toBeTrue()
    })
  })

  describe("ConfigModule.forRoot({ strict: true, coerce: true })", () => {
    let config: TypedConfig<{
      [key: string]: string | number | boolean | null | undefined
    }>

    beforeEach(async () => {
      const app: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ strict: true, coerce: true })],
      }).compile()

      await app.init()

      config = app.get(ConfigService)
    })

    it("it should coerce 'undefined' into undefined (and not throw a strict mode error)", () => {
      expect(config.undefinedEnv).toBeUndefined()
    })
  })
})
