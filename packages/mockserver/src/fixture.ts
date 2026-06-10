import { MockServerClient } from "./client"

const url = process.env.MOCKSERVER_URL
if (!url) {
  throw new Error(
    "@neomaventures/mockserver/fixture: MOCKSERVER_URL is not set. " +
      "Declare it in the .env file your test runner loads (e.g. via " +
      "`node --env-file=.env.e2e`) so it is present before this module is " +
      "imported.",
  )
}

/**
 * Process-wide singleton {@link MockServerClient} wired from the
 * `MOCKSERVER_URL` environment variable.
 *
 * Importing this module registers a `beforeEach` hook in test runners that
 * expose one globally (Jest, Vitest), calling {@link MockServerClient.reset}
 * before every test. This removes the boilerplate of constructing a client
 * and manually clearing expectations in each suite. Playwright Test does
 * not expose a global `beforeEach`; call `await mockserver.reset()` from
 * your own `test.beforeEach` in that runner.
 *
 * The `MOCKSERVER_URL` variable **must** be set before this module is
 * imported — typically via an `.env.e2e` file consumed by `node --env-file`
 * or via a Jest `globalSetup` that runs first. If the variable is unset or
 * empty, importing this module throws.
 *
 * As a process-wide singleton, this fixture is **not** suitable for suites
 * that spin up their own MockServer container (e.g. tests of
 * `MockServerClient` itself, or per-suite isolated containers). Those
 * suites should continue to construct {@link MockServerClient} directly.
 *
 * @example
 * ```typescript
 * import { mockserver } from "@neomaventures/mockserver/fixture"
 *
 * it("serves the mocked endpoint", async () => {
 *   await mockserver.createExpectation({
 *     httpRequest: { path: "/api/users", method: "GET" },
 *     httpResponse: { statusCode: 200, body: "[]" },
 *     times: { unlimited: true },
 *   })
 *
 *   // ...exercise the code under test...
 * })
 * ```
 */
export const mockserver: MockServerClient = new MockServerClient(url)

if (typeof beforeEach === "function") {
  beforeEach(async () => {
    await mockserver.reset()
  })
}
