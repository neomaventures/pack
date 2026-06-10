import { expect, test } from "@playwright/test"

test.describe("Status Page", () => {
  test.describe("When an operator visits /status", () => {
    test.beforeEach(({ page }) => page.goto("/status"))

    test("should display the overall operational banner", async ({ page }) => {
      await expect(page.getByText("All systems operational")).toBeVisible()
    })

    test("should display at least one ok pill", async ({ page }) => {
      await expect(page.getByText("ok", { exact: true }).first()).toBeVisible()
    })

    test("should display the last-checked timestamp", async ({ page }) => {
      await expect(page.getByText(/Last checked at/)).toBeVisible()
    })
  })
})
