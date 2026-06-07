import { readFileSync } from "fs"

import { expect, test } from "@playwright/test"

const { version } = JSON.parse(readFileSync("package.json", "utf-8"))
const npmPackageName = process.env.NPM_PACKAGE_NAME ?? "__PACKAGE_NAME__"

test.describe("Welcome Page", () => {
  test.describe("When a visitor navigates to the homepage", () => {
    test.beforeEach(({ page }) => {
      return page.goto("/")
    })

    test("should display the app name in the heading", async ({ page }) => {
      const headline = page.getByRole("heading", { level: 1 })
      await expect(headline).toHaveText(`Welcome to ${npmPackageName}`)
    })

    test("should display the subtitle", async ({ page }) => {
      const subtitle = page.getByText(
        "A modern SaaS starter built with NestJS and EJS.",
      )
      await expect(subtitle).toBeVisible()
    })

    test("should display the app name in the header brand", async ({
      page,
    }) => {
      const brand = page.getByText(npmPackageName, { exact: true }).first()
      await expect(brand).toBeVisible()
    })

    test("should display the version number", async ({ page }) => {
      const versionMark = page.getByText(`v${version}`)
      await expect(versionMark).toBeVisible()
    })

    test("should navigate to /auth/register when Sign in is clicked", async ({
      page,
    }) => {
      await page.getByRole("link", { name: "Sign in" }).click()
      await expect(page).toHaveURL("/auth/register")
    })
  })
})
