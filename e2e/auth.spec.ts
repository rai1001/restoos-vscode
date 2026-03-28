import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login")
    await expect(page).toHaveTitle(/ChefOS|Login/)
    // Check for login form elements
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible()
    await expect(page.locator("input[type='password']").first()).toBeVisible()
  })

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/")
    // Should redirect to login or show login page
    await expect(page).toHaveURL(/login|auth/)
  })

  test("login page has submit button", async ({ page }) => {
    await page.goto("/login")
    const submitBtn = page.locator("button[type='submit'], button:has-text('Iniciar'), button:has-text('Login'), button:has-text('Entrar')").first()
    await expect(submitBtn).toBeVisible()
  })
})
