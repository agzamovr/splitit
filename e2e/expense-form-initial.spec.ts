import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/new");
});

test.describe("Initial state", () => {
  test("shows the header", async ({ page }) => {
    // The Telegram WebApp script in index.html sets window.Telegram.WebApp, which
    // causes the app to hide its own header. Block that script so the header renders.
    await page.route("**/telegram-web-app.js", (route) => route.abort());
    await page.goto("/new");
    await expect(
      page.getByRole("heading", { name: "Split the Bill" })
    ).toBeVisible();
  });

  test("no avatar focus buttons with no people loaded", async ({ page }) => {
    // Avatar buttons ("Assign expenses to this person") only render for people with telegramId.
    // With no people loaded, there should be zero such buttons.
    await expect(
      page.getByRole("button", { name: "Assign expenses to this person" })
    ).toHaveCount(0);
  });

  test("shows editable manual total input", async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
    await expect(totalInput).toBeVisible();
    await expect(totalInput).toHaveValue("");
  });

  test("Settle button is disabled initially", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Settle" })
    ).toBeDisabled();
  });
});

test.describe("Receipt title", () => {
  test("shows a title input with a default value on load", async ({ page }) => {
    const titleInput = page.getByPlaceholder("Receipt title");
    await expect(titleInput).toBeVisible();
    const value = await titleInput.inputValue();
    // Default is "<Meal> · <Month> <Day>", e.g. "Dinner · Mar 7"
    expect(value).toMatch(/^(Breakfast|Brunch|Lunch|Dinner) · \w+ \d+$/);
  });

  test("default title contains the correct date", async ({ page }) => {
    const titleInput = page.getByPlaceholder("Receipt title");
    const value = await titleInput.inputValue();
    // Extract the date portion after " · "
    const datePart = value.split(" · ")[1]; // e.g. "Mar 7"
    const now = new Date();
    const expectedMonth = now.toLocaleString("en-US", { month: "short" });
    const expectedDay = String(now.getDate());
    expect(datePart).toBe(`${expectedMonth} ${expectedDay}`);
  });

  test("title is editable", async ({ page }) => {
    const titleInput = page.getByPlaceholder("Receipt title");
    await titleInput.fill("Team Lunch");
    await expect(titleInput).toHaveValue("Team Lunch");
  });

  test("title persists independently of other interactions", async ({ page }) => {
    const titleInput = page.getByPlaceholder("Receipt title");
    await titleInput.fill("Friday Dinner");

    // Interact with the form (add a total)
    await page.locator('input[type="number"].text-xl').fill("80");

    await expect(titleInput).toHaveValue("Friday Dinner");
  });
});
