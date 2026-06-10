import { mockserver } from "@neomaventures/mockserver/fixture"

/**
 * Verifies the `/fixture` subpath against the real container started by the
 * package's `globalSetup`. The first test registers a "leak-check"
 * expectation; the second test confirms the fixture's `beforeEach` hook
 * cleared it. If auto-reset is broken, the second test sees the leaked
 * expectation and fails.
 */
describe("@neomaventures/mockserver/fixture (e2e)", () => {
  const port = process.env.MOCKSERVER_PORT ?? "1080"
  const mockUrl = `http://localhost:${port}`

  it("first test creates a leak-check expectation", async () => {
    await mockserver.createExpectation({
      httpRequest: { path: "/leak-check", method: "GET" },
      httpResponse: { statusCode: 200, body: "leaked" },
      times: { unlimited: true },
    })

    const response = await fetch(`${mockUrl}/leak-check`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("leaked")
  })

  it("second test sees no leaked expectation (proves auto-reset)", async () => {
    const response = await fetch(`${mockUrl}/leak-check`)

    expect(response.status).toBe(404)
  })
})
