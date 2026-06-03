import { MockServerClient } from "@neomaventures/mockserver"

/**
 * End-to-end check against a real container, consuming the package the
 * way an installer would: imports resolve to the built `dist` at runtime
 * (see e2e/jest-e2e.json), and the container is started by the built
 * `setup` drop-in (globalSetup, via dist/setup.js). Types still resolve
 * to `src` (tsconfig paths) so goto-definition and debugging stay on
 * source.
 */
describe("@neomaventures/mockserver (e2e)", () => {
  // The e2e script sets MOCKSERVER_PORT; startContainer reads it for the host port.
  const port = process.env.MOCKSERVER_PORT ?? "1080"
  const controlUrl = (): string => `http://localhost:${port}/mockserver`
  const mockUrl = (): string => `http://localhost:${port}`

  let client: MockServerClient

  beforeAll(() => {
    client = new MockServerClient(controlUrl())
  })

  beforeEach(async () => {
    await client.reset()
  })

  it("serves a configured expectation against the live container", async () => {
    await client.createExpectation({
      httpRequest: { path: "/health", method: "GET" },
      httpResponse: { statusCode: 200, body: "ok" },
      times: { unlimited: true },
    })

    const response = await fetch(`${mockUrl()}/health`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("ok")
    expect(
      await client.verifyExpectationMatched({ path: "/health", method: "GET" }),
    ).toBe(true)
  })
})
