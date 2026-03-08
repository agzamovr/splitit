import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Equal split", () => {
  test("splits total equally among people", async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");

    // In equally mode, amounts are displayed as spans (100 / 4 = 25.00 each)
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    await expect(personRows.nth(0)).toContainText("25.00");
    await expect(personRows.nth(1)).toContainText("25.00");
    await expect(personRows.nth(2)).toContainText("25.00");
    await expect(personRows.nth(3)).toContainText("25.00");

    await expect(page.getByText("Balanced")).toBeVisible();
  });

  test("handles remainder correctly — last person gets extra cent", async ({
    page,
  }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("10");

    // 10 / 4 = 2.50 each, no remainder
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    await expect(personRows.nth(0)).toContainText("2.50");
    await expect(personRows.nth(3)).toContainText("2.50");

    // Now try an amount that doesn't divide evenly
    await totalInput.fill("");
    await totalInput.fill("10.01");

    // 10.01 / 4 = 2.50 base, last gets 2.51
    await expect(personRows.nth(0)).toContainText("2.50");
    await expect(personRows.nth(1)).toContainText("2.50");
    await expect(personRows.nth(2)).toContainText("2.50");
    await expect(personRows.nth(3)).toContainText("2.51");
  });

  test("amount display is read-only in equally mode (no inputs in person rows)", async ({ page }) => {
    // In equally mode person amounts are spans, not editable inputs
    const personAmountInputs = page
      .locator("li")
      .filter({ has: page.getByPlaceholder("Name") })
      .locator('input[type="number"][placeholder="0.00"]');
    await expect(personAmountInputs).toHaveCount(0);
  });

  test("recalculates when people are added or removed", async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");

    // Remove one person: 100 / 3 = 33.33, last gets 33.34
    await page
      .getByRole("button", { name: "Remove person" })
      .first()
      .click();
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    await expect(personRows.nth(0)).toContainText("33.33");
    await expect(personRows.nth(2)).toContainText("33.34");

    await expect(page.getByText("Balanced")).toBeVisible();
  });

  test("shows balanced state with any total when people exist", async ({
    page,
  }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("123.45");
    await expect(page.getByText("Balanced")).toBeVisible();

    // Settle button enabled when isBalanced && people.length > 0 && total > 0
    await expect(
      page.getByRole("button", { name: "Settle" })
    ).toBeEnabled();
  });
});

test.describe("Manual total (amounts mode)", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole("button", { name: "Amounts" }).click();
  });

  test("shows covered amount as sum of person amounts", async ({ page }) => {
    const amountInputs = page
      .locator("li")
      .filter({ has: page.getByPlaceholder("Name") })
      .locator('input[type="number"][placeholder="0.00"]');
    await amountInputs.nth(0).fill("30");
    await amountInputs.nth(1).fill("20");

    const coveredRow = page.locator("div").filter({ hasText: "Covered" }).last();
    await expect(coveredRow).toContainText("50.00");
  });

  test("balanced when manual total equals covered amount", async ({
    page,
  }) => {
    const amountInputs = page
      .locator("li")
      .filter({ has: page.getByPlaceholder("Name") })
      .locator('input[type="number"][placeholder="0.00"]');
    await amountInputs.nth(0).fill("25");
    await amountInputs.nth(1).fill("25");
    await amountInputs.nth(2).fill("25");
    await amountInputs.nth(3).fill("25");

    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");
    await expect(page.getByText("Balanced")).toBeVisible();
  });

  test("shows remaining status when total exceeds covered", async ({
    page,
  }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");
    // covered = 0 (empty amounts), remaining = 100
    const remainingRow = page.locator("div").filter({ hasText: "Remaining" }).last();
    await expect(remainingRow).toContainText("100.00");
  });
});

test.describe("Balance badges", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole("button", { name: "Amounts" }).click();
  });

  test('shows "Balanced" when covered equals total', async ({ page }) => {
    const amountInputs = page
      .locator("li")
      .filter({ has: page.getByPlaceholder("Name") })
      .locator('input[type="number"][placeholder="0.00"]');
    await amountInputs.nth(0).fill("25");
    await amountInputs.nth(1).fill("25");
    await amountInputs.nth(2).fill("25");
    await amountInputs.nth(3).fill("25");

    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");
    await expect(page.getByText("Balanced")).toBeVisible();
  });

  test('shows "Over" badge when covered exceeds total', async ({ page }) => {
    const amountInputs = page
      .locator("li")
      .filter({ has: page.getByPlaceholder("Name") })
      .locator('input[type="number"][placeholder="0.00"]');
    await amountInputs.nth(0).fill("30");
    await amountInputs.nth(1).fill("30");

    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("50");
    // covered = 60 > total = 50
    await expect(page.getByText("Over", { exact: true })).toBeVisible();
  });

  test('shows "Remaining" badge when underpaid', async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");
    // covered = 0 (all empty amounts) < total = 100; badge is nth(1) since label is nth(0)
    await expect(page.getByText("Remaining").nth(1)).toBeVisible();
    const remainingRow = page.locator("div").filter({ hasText: "Remaining" }).last();
    await expect(remainingRow).toContainText("100.00");
  });
});

test.describe("Submit button", () => {
  test("enabled when balanced and people exist, disabled otherwise", async ({
    page,
  }) => {
    const settleBtn = page.getByRole("button", { name: "Settle" });
    await expect(settleBtn).toBeDisabled();

    // Balance it using equally mode (total set → always balanced)
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");
    await expect(settleBtn).toBeEnabled();

    // Remove all people — should disable
    for (let i = 0; i < 4; i++) {
      await page
        .getByRole("button", { name: "Remove person" })
        .first()
        .click();
    }
    await expect(settleBtn).toBeDisabled();
  });
});
