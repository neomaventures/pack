import { MockServerClient } from "@lib"

/**
 * End-to-end check of @neoma/mockserver against a real container: the
 * container is started by the built `setup` drop-in (globalSetup, via
 * dist/setup.js) and the public `MockServerClient` is driven against it.
 */
describe("@neoma/mockserver (e2e)", () => {
  // globalSetup (@neoma/mockserver/setup) sets MOCKSERVER_URL.
  const controlUrl = (): string => process.env.MOCKSERVER_URL as string
  const mockUrl = (): string => controlUrl().replace("/mockserver", "")

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
