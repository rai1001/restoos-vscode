import { test, expect } from "@playwright/test"

test.describe("Events module", () => {
  test("events route responds without error", async ({ page }) => {
    const response = await page.goto("/events")
    expect(response?.status()).not.toBe(500)
    expect(response?.status()).not.toBe(404)
  })

  test("login page form is interactive", async ({ page }) => {
    await page.goto("/login")
    const emailInput = page.locator("input[type='email'], input[name='email']").first()
    if (await emailInput.isVisible()) {
      await emailInput.fill("test@example.com")
      await expect(emailInput).toHaveValue("test@example.com")
    }
  })
})
