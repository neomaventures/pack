import { faker } from "@faker-js/faker"
import { Test } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import { RequestContextModule } from "@neomaventures/request-context"

import { type ContextSlot, createContextSlot } from "./create-context-slot"

interface TestProfile {
  name: string
  age: number
  greet(): string
}

describe("createContextSlot", () => {
  let cls: ClsService
  let slot: ContextSlot<TestProfile>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
    }).compile()

    cls = module.get(ClsService)
    slot = createContextSlot<TestProfile>("@test:profile")
  })

  describe("get()", () => {
    describe("Given an active context with a stored value", () => {
      it("should return the stored value", () => {
        const profile: TestProfile = {
          name: faker.person.firstName(),
          age: faker.number.int({ min: 18, max: 99 }),
          greet(): string {
            return `Hi, I'm ${this.name}`
          },
        }

        const result = cls.run(() => {
          slot.set(profile)
          return slot.get()
        })

        expect(result).toBe(profile)
      })
    })

    describe("Given an active context with no value stored", () => {
      it("should return undefined", () => {
        const result = cls.run(() => slot.get())
        expect(result).toBeUndefined()
      })
    })

    describe("Given no active context", () => {
      it("should return undefined", () => {
        expect(slot.get()).toBeUndefined()
      })
    })
  })

  describe("set()", () => {
    describe("Given an active context", () => {
      it("should store the value so get() can retrieve it", () => {
        const profile: TestProfile = {
          name: faker.person.firstName(),
          age: faker.number.int({ min: 18, max: 99 }),
          greet(): string {
            return `Hi, I'm ${this.name}`
          },
        }

        const result = cls.run(() => {
          slot.set(profile)
          return slot.get()
        })

        expect(result).toBe(profile)
      })
    })
  })

  describe("token", () => {
    describe("Given a slot created with a key", () => {
      it("should be a Symbol", () => {
        expect(typeof slot.token).toBe("symbol")
      })

      it("should have a description matching the key", () => {
        expect(slot.token.description).toBe("@test:profile")
      })
    })
  })

  describe("param", () => {
    describe("Given a slot", () => {
      it("should return a function", () => {
        expect(typeof slot.param).toBe("function")
      })

      it("should return a ParameterDecorator when called", () => {
        const decorator = slot.param()
        expect(typeof decorator).toBe("function")
      })
    })
  })

  describe("provider", () => {
    describe("Given a slot", () => {
      it("should have provide set to the slot token", () => {
        expect(slot.provider.provide).toBe(slot.token)
      })

      it("should have a useValue that is a Proxy", () => {
        expect(slot.provider.useValue).toBeDefined()
      })
    })

    describe("Given the proxy is injected and a value is stored", () => {
      it("should delegate property access to the stored value", () => {
        const name = faker.person.firstName()
        const age = faker.number.int({ min: 18, max: 99 })
        const profile: TestProfile = {
          name,
          age,
          greet(): string {
            return `Hi, I'm ${this.name}`
          },
        }

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue as TestProfile
          expect(proxy.name).toBe(name)
          expect(proxy.age).toBe(age)
        })
      })

      it("should delegate method calls with correct this-binding", () => {
        const name = faker.person.firstName()
        const profile: TestProfile = {
          name,
          age: faker.number.int({ min: 18, max: 99 }),
          greet(): string {
            return `Hi, I'm ${this.name}`
          },
        }

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue as TestProfile
          expect(proxy.greet()).toBe(`Hi, I'm ${name}`)
        })
      })

      it("should delegate 'in' operator via has trap", () => {
        const profile: TestProfile = {
          name: faker.person.firstName(),
          age: faker.number.int({ min: 18, max: 99 }),
          greet(): string {
            return `Hi, I'm ${this.name}`
          },
        }

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue as TestProfile
          expect("name" in proxy).toBe(true)
          expect("nonexistent" in proxy).toBe(false)
        })
      })

      it("should delegate ownKeys to the stored value", () => {
        const profile: TestProfile = {
          name: faker.person.firstName(),
          age: faker.number.int({ min: 18, max: 99 }),
          greet(): string {
            return `Hi, I'm ${this.name}`
          },
        }

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue
          expect(Reflect.ownKeys(proxy as object)).toEqual(
            Reflect.ownKeys(profile),
          )
        })
      })

      it("should delegate getPrototypeOf to the stored value", () => {
        const profile: TestProfile = {
          name: faker.person.firstName(),
          age: faker.number.int({ min: 18, max: 99 }),
          greet(): string {
            return `Hi, I'm ${this.name}`
          },
        }

        cls.run(() => {
          slot.set(profile)
          const proxy = slot.provider.useValue
          expect(Object.getPrototypeOf(proxy)).toBe(
            Object.getPrototypeOf(profile),
          )
        })
      })
    })

    describe("Given the proxy is accessed with no value stored", () => {
      it("should return undefined for property access", () => {
        cls.run(() => {
          const proxy = slot.provider.useValue as TestProfile
          expect(proxy.name).toBeUndefined()
        })
      })

      it("should return false for 'in' operator", () => {
        cls.run(() => {
          const proxy = slot.provider.useValue as TestProfile
          expect("name" in proxy).toBe(false)
        })
      })

      it("should return empty array for ownKeys", () => {
        cls.run(() => {
          const proxy = slot.provider.useValue
          expect(Reflect.ownKeys(proxy as object)).toEqual([])
        })
      })

      it("should return null for getPrototypeOf", () => {
        cls.run(() => {
          const proxy = slot.provider.useValue
          expect(Object.getPrototypeOf(proxy)).toBeNull()
        })
      })
    })

    describe("Given no active context", () => {
      it("should return undefined for property access", () => {
        const proxy = slot.provider.useValue as TestProfile
        expect(proxy.name).toBeUndefined()
      })
    })
  })
})
