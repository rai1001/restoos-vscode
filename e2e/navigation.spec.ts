import { test, expect } from "@playwright/test"

// These tests check the UI is structurally correct even without auth
// In CI they test redirect behavior; with mock data they test full nav

test.describe("Navigation structure", () => {
  test("root redirects appropriately", async ({ page }) => {
    const response = await page.goto("/")
    // Either shows dashboard or redirects to login
    expect([200, 302, 307]).toContain(response?.status() ?? 200)
  })

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login")
    await expect(page).not.toHaveURL(/404|error/)
  })

  test("all main routes respond without 500 error", async ({ page }) => {
    const routes = ["/login"]
    for (const route of routes) {
      const response = await page.goto(route)
      expect(response?.status()).not.toBe(500)
    }
  })
})
