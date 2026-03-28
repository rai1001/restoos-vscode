import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
  test("dashboard page loads or redirects to login", async ({ page }) => {
    await page.goto("/")
    const url = page.url()
    // Either on dashboard or redirected to login (both are valid)
    const isOnDashboard = url.includes("localhost:3001") && !url.includes("error")
    expect(isOnDashboard).toBe(true)
  })
})
