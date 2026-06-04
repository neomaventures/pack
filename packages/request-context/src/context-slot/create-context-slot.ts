import { type ValueProvider, createParamDecorator } from "@nestjs/common"
import { ClsServiceManager } from "nestjs-cls"

/**
 * The shape returned by {@link createContextSlot}. Each property is a different
 * "form" for accessing the same namespaced ALS value: a plain accessor, a
 * param decorator, an injection token, and a DI provider.
 *
 * @typeParam T - The type of the value stored in this slot.
 */
export interface ContextSlot<T> {
  /** Read the current value from the ALS store. Returns `undefined` outside a context. */
  get: () => T | undefined
  /** Write a value into the current ALS store under this slot's key. */
  set: (value: T) => void
  /** A function returning a `ParameterDecorator` that resolves to `get()` at request time. */
  param: () => ParameterDecorator
  /** A `Symbol` injection token for use with `@Inject()`. */
  token: symbol
  /** A `ValueProvider` whose `useValue` is a proxy that delegates to `get()` per-request. */
  provider: ValueProvider
}

/**
 * Create a typed context slot backed by a single namespaced key in the
 * per-request `AsyncLocalStorage` store. Returns all five forms a consumer
 * package needs to expose the value: a plain accessor (`get`/`set`), a
 * `@Param()` decorator, a DI injection token, and a provider to register.
 *
 * The slot is domain-agnostic -- `request-context` has no knowledge of what
 * the value represents. Each consumer package (e.g. `@neomaventures/auth`)
 * calls this factory once, names its exports, and registers the provider in
 * its own module.
 *
 * @typeParam T - The type of the value stored in this slot.
 * @param key - A namespaced string key (e.g. `@neomaventures/auth:principal`).
 * @returns A {@link ContextSlot} with all five access forms.
 *
 * @example Create a principal slot in an auth package
 * ```typescript
 * const principalSlot = createContextSlot<Authenticatable>("@neoma/auth:principal")
 * export const getPrincipal      = principalSlot.get
 * export const setPrincipal      = principalSlot.set
 * export const Principal         = principalSlot.param
 * export const CurrentPrincipal  = principalSlot.token
 * export const principalProvider = principalSlot.provider
 * ```
 */
export function createContextSlot<T>(key: string): ContextSlot<T> {
  const get = (): T | undefined =>
    ClsServiceManager.getClsService().get(key) as T | undefined

  const set = (value: T): void => {
    ClsServiceManager.getClsService().set(key, value)
  }

  const param = (): ParameterDecorator => createParamDecorator(() => get())()

  const token: symbol = Symbol(key)

  const proxy = new Proxy(
    Object.create(null) as Record<string | symbol, unknown>,
    {
      get(_target, prop): unknown {
        const value = get()
        if (value == null) return undefined
        const result = (value as Record<string | symbol, unknown>)[prop]
        return typeof result === "function"
          ? (result as (...args: unknown[]) => unknown).bind(value)
          : result
      },
      set(_target, prop, newValue): boolean {
        const value = get()
        if (value == null) return false
        ;(value as Record<string | symbol, unknown>)[prop] = newValue
        return true
      },
      has(_target, prop): boolean {
        const value = get()
        if (value == null) return false
        return prop in (value as object)
      },
      ownKeys(): Array<string | symbol> {
        const value = get()
        if (value == null) return []
        return Reflect.ownKeys(value as object)
      },
      getPrototypeOf(): object | null {
        const value = get()
        if (value == null) return null
        return Object.getPrototypeOf(value as object) as object | null
      },
      getOwnPropertyDescriptor(_target, prop): PropertyDescriptor | undefined {
        const value = get()
        if (value == null) return undefined
        return Object.getOwnPropertyDescriptor(value as object, prop)
      },
    },
  )

  const provider: ValueProvider = {
    provide: token,
    useValue: proxy,
  }

  return { get, set, param, token, provider }
}
