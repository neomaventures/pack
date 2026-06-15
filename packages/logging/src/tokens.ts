/**
 * Build the DI token used to register and inject a namespaced logger.
 *
 * Returns a **string** (not a symbol) deliberately: symbols are reference-
 * equal only within a single module realm. Two packages calling
 * `getLoggerToken('neomaventures:logging:auth')` must produce the same token
 * regardless of which copy of `@neomaventures/logging` resolved it in their
 * `node_modules` tree. Strings guarantee this.
 *
 * The `NEOMA_LOGGER:` prefix keeps unresolved-dependency errors readable
 * (Nest prints the token verbatim in `UnknownDependenciesException`).
 *
 * @param namespace - The logger's globally-unique namespace.
 * @returns The DI token, of the form `NEOMA_LOGGER:<namespace>`.
 *
 * @example
 * ```ts
 * @Inject(getLoggerToken("neomaventures:auth"))
 * private readonly logger: Logger
 * ```
 *
 * @see InjectLogger — the sugar around this token.
 */
export const getLoggerToken = (namespace: string): string =>
  `NEOMA_LOGGER:${namespace}`
