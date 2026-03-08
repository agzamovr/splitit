import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Full workflow", () => {
  test("equal split: add expenses and verify auto-balanced", async ({
    page,
  }) => {
    // Remove all pre-loaded people
    for (let i = 0; i < 4; i++) {
      await page
        .getByRole("button", { name: "Remove person" })
        .first()
        .click();
    }

    // Add two people via picker
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Alice");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Bob");
    await page.keyboard.press("Enter");

    // Add two expenses
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByRole("button", { name: "Add expense" }).click();

    const descInputs = page.getByPlaceholder("Description");
    await descInputs.nth(0).fill("Pizza");
    await descInputs.nth(1).fill("Drinks");

    const expensePrices = page.locator(
      'li input[type="number"][placeholder="0.00"]'
    );
    await expensePrices.nth(0).fill("30");
    await expensePrices.nth(1).fill("20");

    // Total should be $50.00
    await expect(page.getByText("$50.00").first()).toBeVisible();

    // In equally mode, each person gets $25.00 automatically (shown as spans)
    const personRows = page.locator("li", {
      has: page.getByPlaceholder("Name"),
    });
    await expect(personRows.nth(0)).toContainText("25.00");
    await expect(personRows.nth(1)).toContainText("25.00");

    await expect(page.getByText("Balanced")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Settle" })
    ).toBeEnabled();
  });

  test("amounts mode: manually set person amounts and balance", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Amounts" }).click();

    // Remove all pre-loaded people
    for (let i = 0; i < 4; i++) {
      await page
        .getByRole("button", { name: "Remove person" })
        .first()
        .click();
    }

    // Add two people via picker
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Alice");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Bob");
    await page.keyboard.press("Enter");

    // Add two expenses
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByRole("button", { name: "Add expense" }).click();

    const descInputs = page.getByPlaceholder("Description");
    await descInputs.nth(0).fill("Pizza");
    await descInputs.nth(1).fill("Drinks");

    const expensePrices = page.locator(
      'li input[type="number"][placeholder="0.00"]'
    );
    await expensePrices.nth(0).fill("30");
    await expensePrices.nth(1).fill("20");

    // Total should be $50.00
    await expect(page.getByText("$50.00").first()).toBeVisible();

    // Set person amounts manually
    const personRows = page.locator("li", {
      has: page.getByPlaceholder("Name"),
    });
    await personRows.nth(0).locator('input[type="number"]').fill("25");
    await personRows.nth(1).locator('input[type="number"]').fill("25");

    await expect(page.getByText("Balanced")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Settle" })
    ).toBeEnabled();
  });
});
