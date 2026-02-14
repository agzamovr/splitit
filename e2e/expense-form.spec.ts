import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Initial state", () => {
  test("shows the header", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Split the Bill" })
    ).toBeVisible();
    await expect(page.getByText("Who's paying what?")).toBeVisible();
  });

  test("shows pre-loaded people names", async ({ page }) => {
    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(4);
    await expect(nameInputs.nth(0)).toHaveValue("Alex");
    await expect(nameInputs.nth(1)).toHaveValue("Jordan");
    await expect(nameInputs.nth(2)).toHaveValue("Sam");
    await expect(nameInputs.nth(3)).toHaveValue("Riley");
  });

  test("shows empty amounts in equally mode with no total", async ({
    page,
  }) => {
    const amountInputs = page.locator(
      '.space-y-2 input[type="number"][placeholder="0.00"]'
    );
    await expect(amountInputs.nth(0)).toHaveValue("");
    await expect(amountInputs.nth(1)).toHaveValue("");
    await expect(amountInputs.nth(2)).toHaveValue("");
    await expect(amountInputs.nth(3)).toHaveValue("");
  });

  test("shows pre-loaded amounts in amounts mode", async ({ page }) => {
    await page.getByRole("button", { name: "Amounts" }).click();

    const amountInputs = page.locator(
      '.space-y-2 input[type="number"][placeholder="0.00"]'
    );
    await expect(amountInputs.nth(0)).toHaveValue("24.50");
    await expect(amountInputs.nth(1)).toHaveValue("18.00");
    await expect(amountInputs.nth(2)).toHaveValue("32.75");
    await expect(amountInputs.nth(3)).toHaveValue("");
  });

  test("displays correct avatar initials", async ({ page }) => {
    const avatars = page.locator(".rounded-full.bg-gradient-to-br");
    await expect(avatars.nth(0)).toHaveText("A");
    await expect(avatars.nth(1)).toHaveText("J");
    await expect(avatars.nth(2)).toHaveText("S");
    await expect(avatars.nth(3)).toHaveText("R");
  });

  test("shows editable manual total input", async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-3xl');
    await expect(totalInput).toBeVisible();
    await expect(totalInput).toHaveValue("");
  });

  test("submit button is disabled initially", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Save Split" })
    ).toBeDisabled();
  });
});

test.describe("Equal split", () => {
  test("splits total equally among people", async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-3xl');
    await totalInput.fill("100");

    const amountInputs = page.locator(
      '.space-y-2 input[type="number"][placeholder="0.00"]'
    );
    // 100 / 4 = 25.00 each
    await expect(amountInputs.nth(0)).toHaveValue("25.00");
    await expect(amountInputs.nth(1)).toHaveValue("25.00");
    await expect(amountInputs.nth(2)).toHaveValue("25.00");
    await expect(amountInputs.nth(3)).toHaveValue("25.00");

    await expect(page.getByText("Perfectly split!")).toBeVisible();
  });

  test("handles remainder correctly — last person gets extra cent", async ({
    page,
  }) => {
    const totalInput = page.locator('input[type="number"].text-3xl');
    await totalInput.fill("10");

    // 10 / 4 = 2.50 each, no remainder
    const amountInputs = page.locator(
      '.space-y-2 input[type="number"][placeholder="0.00"]'
    );
    await expect(amountInputs.nth(0)).toHaveValue("2.50");
    await expect(amountInputs.nth(3)).toHaveValue("2.50");

    // Now try an amount that doesn't divide evenly
    await totalInput.fill("");
    await totalInput.fill("10.01");

    // 10.01 / 4 = 2.50 base, last gets 2.51
    await expect(amountInputs.nth(0)).toHaveValue("2.50");
    await expect(amountInputs.nth(1)).toHaveValue("2.50");
    await expect(amountInputs.nth(2)).toHaveValue("2.50");
    await expect(amountInputs.nth(3)).toHaveValue("2.51");
  });

  test("amount inputs are read-only in equally mode", async ({ page }) => {
    const amountInputs = page.locator(
      '.space-y-2 input[type="number"][placeholder="0.00"]'
    );
    await expect(amountInputs.nth(0)).toHaveAttribute("readonly", "");
  });

  test("recalculates when people are added or removed", async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-3xl');
    await totalInput.fill("100");

    // Remove one person: 100 / 3 = 33.33, last gets 33.34
    await page
      .getByRole("button", { name: "Remove person" })
      .first()
      .click();
    const amountInputs = page.locator(
      '.space-y-2 input[type="number"][placeholder="0.00"]'
    );
    await expect(amountInputs.nth(0)).toHaveValue("33.33");
    await expect(amountInputs.nth(2)).toHaveValue("33.34");

    await expect(page.getByText("Perfectly split!")).toBeVisible();
  });

  test("shows perfectly split with any total when people exist", async ({
    page,
  }) => {
    const totalInput = page.locator('input[type="number"].text-3xl');
    await totalInput.fill("123.45");
    await expect(page.getByText("Perfectly split!")).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Save Split" })
    ).toBeEnabled();
  });
});

test.describe("Manual total (amounts mode)", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole("button", { name: "Amounts" }).click();
  });

  test("shows covered amount as sum of person amounts", async ({ page }) => {
    await expect(page.getByText("$75.25").first()).toBeVisible();
  });

  test("balanced when manual total equals covered amount", async ({
    page,
  }) => {
    const totalInput = page.locator('input[type="number"].text-3xl');
    await totalInput.fill("75.25");
    await expect(page.getByText("Perfectly split!")).toBeVisible();
  });

  test("shows underpaid status when total exceeds covered", async ({
    page,
  }) => {
    const totalInput = page.locator('input[type="number"].text-3xl');
    await totalInput.fill("100");
    await expect(page.getByText("$24.75 left to cover")).toBeVisible();
  });
});

test.describe("Expense items", () => {
  test("first expense inherits manual total value", async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-3xl');
    await totalInput.fill("42.50");
    await page.getByRole("button", { name: "Add expense" }).click();

    const expensePrice = page
      .locator('ul input[type="number"][placeholder="0.00"]')
      .first();
    await expect(expensePrice).toHaveValue("42.50");
  });

  test("adding multiple expenses sums their prices", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByRole("button", { name: "Add expense" }).click();

    const expensePrices = page.locator(
      'li input[type="number"][placeholder="0.00"]'
    );
    await expensePrices.nth(0).fill("30");
    await expensePrices.nth(1).fill("20");

    await expect(page.getByText("$50.00").first()).toBeVisible();
  });

  test("can edit expense description and price", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();

    const descInput = page.getByPlaceholder("Description");
    await descInput.fill("Lunch");
    await expect(descInput).toHaveValue("Lunch");

    const priceInput = page
      .locator('li input[type="number"][placeholder="0.00"]')
      .first();
    await priceInput.fill("25.50");
    await expect(priceInput).toHaveValue("25.50");
  });

  test("removing expense updates total", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByRole("button", { name: "Add expense" }).click();

    const expensePrices = page.locator(
      'li input[type="number"][placeholder="0.00"]'
    );
    await expensePrices.nth(0).fill("30");
    await expensePrices.nth(1).fill("20");

    await page
      .getByRole("button", { name: "Remove expense" })
      .first()
      .click();

    await expect(page.getByText("$20.00").first()).toBeVisible();
  });

  test("expense badge shows assigned people count and enters assignment mode", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();

    const assignBtn = page.getByRole("button", {
      name: "Assign people to this expense",
    });
    await expect(assignBtn).toBeVisible();

    // Badge should show count of all people (4 sample people)
    await expect(assignBtn).toContainText("4");

    // Click to enter item assignment mode
    await assignBtn.click();

    // Split mode tabs should still be visible (no Save/Cancel)
    await expect(page.getByRole("button", { name: "Equally" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Amounts" })).toBeVisible();
  });

  test("tapping same expense badge again exits assignment mode", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    const expensePrices = page.locator('li input[type="number"][placeholder="0.00"]');
    await expensePrices.nth(0).fill("40");

    const assignBtn = page.getByRole("button", {
      name: "Assign people to this expense",
    });

    // Enter assignment mode
    await assignBtn.click();

    // Tap again to exit (toggle-off)
    await assignBtn.click();

    // Should switch to amounts mode with computed values
    const amountsBtn = page.getByRole("button", { name: "Amounts" });
    await expect(amountsBtn).toHaveClass(/bg-white/);

    // Each of 4 people should have 10.00 (40/4)
    const personRows = page.locator("li", {
      has: page.getByPlaceholder("Name"),
    });
    await expect(personRows.nth(0).locator('input[type="number"]')).toHaveValue("10.00");
    await expect(personRows.nth(1).locator('input[type="number"]')).toHaveValue("10.00");
    await expect(personRows.nth(2).locator('input[type="number"]')).toHaveValue("10.00");
    await expect(personRows.nth(3).locator('input[type="number"]')).toHaveValue("10.00");
  });

  test("removing all expenses restores manual total input", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add expense" }).click();

    // Manual total input should be gone (replaced by computed total)
    const totalInput = page.locator('input[type="number"].text-3xl');
    await expect(totalInput).toBeHidden();

    await page.getByRole("button", { name: "Remove expense" }).click();

    // Manual total input should reappear
    await expect(totalInput).toBeVisible();
  });
});

test.describe("People management", () => {
  test("adding a person shows ? avatar", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();

    const avatars = page.locator(".rounded-full.bg-gradient-to-br");
    await expect(avatars.nth(4)).toHaveText("?");
  });

  test("editing name updates avatar initial", async ({ page }) => {
    const nameInputs = page.getByPlaceholder("Name");
    await nameInputs.nth(0).fill("Bella");

    const avatars = page.locator(".rounded-full.bg-gradient-to-br");
    await expect(avatars.nth(0)).toHaveText("B");
  });

  test("editing person amount updates covered total", async ({ page }) => {
    await page.getByRole("button", { name: "Amounts" }).click();

    // Initial covered: $75.25 (24.50 + 18.00 + 32.75 + 0)
    const amountInputs = page.locator(
      '.space-y-2 input[type="number"][placeholder="0.00"]'
    );
    await amountInputs.nth(3).fill("10");

    // New covered: $85.25
    await expect(page.getByText("$85.25").first()).toBeVisible();
  });

  test("split mode defaults to Equally", async ({ page }) => {
    const equallyBtn = page.getByRole("button", { name: "Equally" });
    await expect(equallyBtn).toBeVisible();
    await expect(equallyBtn).toHaveClass(/bg-white/);
  });

  test("can switch between Equally and Amounts split modes", async ({ page }) => {
    const amountsBtn = page.getByRole("button", { name: "Amounts" });
    const equallyBtn = page.getByRole("button", { name: "Equally" });

    await amountsBtn.click();
    await expect(amountsBtn).toHaveClass(/bg-white/);
    await expect(equallyBtn).not.toHaveClass(/bg-white/);

    await equallyBtn.click();
    await expect(equallyBtn).toHaveClass(/bg-white/);
    await expect(amountsBtn).not.toHaveClass(/bg-white/);
  });
});

test.describe("Balance badges", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole("button", { name: "Amounts" }).click();
  });

  test('shows "Perfectly split!" when balanced', async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-3xl');
    await totalInput.fill("75.25");
    await expect(page.getByText("Perfectly split!")).toBeVisible();
  });

  test('shows "Over by $X" when covered exceeds total', async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-3xl');
    await totalInput.fill("50");
    await expect(page.getByText("Over by $25.25")).toBeVisible();
  });

  test('shows "$X left to cover" when underpaid', async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-3xl');
    await totalInput.fill("100");
    await expect(page.getByText("$24.75 left to cover")).toBeVisible();
  });
});

test.describe("Submit button", () => {
  test("enabled when balanced and people exist, disabled otherwise", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Amounts" }).click();

    const submitBtn = page.getByRole("button", { name: "Save Split" });
    await expect(submitBtn).toBeDisabled();

    // Balance it
    const totalInput = page.locator('input[type="number"].text-3xl');
    await totalInput.fill("75.25");
    await expect(submitBtn).toBeEnabled();

    // Remove all people — should disable
    for (let i = 0; i < 4; i++) {
      await page
        .getByRole("button", { name: "Remove person" })
        .first()
        .click();
    }
    await expect(submitBtn).toBeDisabled();
  });
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

    // Add two people
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByRole("button", { name: "Add Person" }).click();

    const nameInputs = page.getByPlaceholder("Name");
    await nameInputs.nth(0).fill("Alice");
    await nameInputs.nth(1).fill("Bob");

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

    // In equally mode, each person gets $25.00 automatically
    const personRows = page.locator("li", {
      has: page.getByPlaceholder("Name"),
    });
    await expect(
      personRows.nth(0).locator('input[type="number"]')
    ).toHaveValue("25.00");
    await expect(
      personRows.nth(1).locator('input[type="number"]')
    ).toHaveValue("25.00");

    await expect(page.getByText("Perfectly split!")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save Split" })
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

    // Add two people
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByRole("button", { name: "Add Person" }).click();

    const nameInputs = page.getByPlaceholder("Name");
    await nameInputs.nth(0).fill("Alice");
    await nameInputs.nth(1).fill("Bob");

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

    await expect(page.getByText("Perfectly split!")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save Split" })
    ).toBeEnabled();
  });
});
