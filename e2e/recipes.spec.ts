import { test, expect } from "@playwright/test"

test.describe("Recipes module", () => {
  test("recipes route responds", async ({ page }) => {
    const response = await page.goto("/recipes")
    // Should redirect to login (302/307) or show page (200)
    expect(response?.status()).not.toBe(500)
    expect(response?.status()).not.toBe(404)
  })
})
