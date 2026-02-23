import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Initial state", () => {
  test("shows the header", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Split the Bill" })
    ).toBeVisible();
  });

  test("shows pre-loaded people names", async ({ page }) => {
    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(4);
    await expect(nameInputs.nth(0)).toHaveValue("Rus");
    await expect(nameInputs.nth(1)).toHaveValue("Don");
    await expect(nameInputs.nth(2)).toHaveValue("Art");
    await expect(nameInputs.nth(3)).toHaveValue("Faz");
  });

  test("shows dash amounts in equally mode with no total", async ({
    page,
  }) => {
    // In equally mode with no total, computed amounts are 0 — shown as "—"
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    await expect(personRows.nth(0)).toContainText("—");
    await expect(personRows.nth(1)).toContainText("—");
    await expect(personRows.nth(2)).toContainText("—");
    await expect(personRows.nth(3)).toContainText("—");
  });

  test("shows empty amount inputs in amounts mode", async ({ page }) => {
    await page.getByRole("button", { name: "Amounts" }).click();

    const amountInputs = page
      .locator("li")
      .filter({ has: page.getByPlaceholder("Name") })
      .locator('input[type="number"][placeholder="0.00"]');
    await expect(amountInputs).toHaveCount(4);
    await expect(amountInputs.nth(0)).toHaveValue("");
    await expect(amountInputs.nth(1)).toHaveValue("");
    await expect(amountInputs.nth(2)).toHaveValue("");
    await expect(amountInputs.nth(3)).toHaveValue("");
  });

  test("displays correct avatar initials", async ({ page }) => {
    const avatars = page.locator(".rounded-full.bg-gradient-to-br");
    await expect(avatars.nth(0)).toHaveText("R");
    await expect(avatars.nth(1)).toHaveText("D");
    await expect(avatars.nth(2)).toHaveText("A");
    await expect(avatars.nth(3)).toHaveText("F");
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

test.describe("Expense items", () => {
  test("first expense inherits manual total value", async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
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

    // Split mode stays Equally (assignment mode exit doesn't change split mode)
    const equallyBtn = page.getByRole("button", { name: "Equally" });
    await expect(equallyBtn).toHaveClass(/bg-white/);

    // Each of 4 people should show 10.00 (40/4) as spans in equally mode
    const personRows = page.locator("li", {
      has: page.getByPlaceholder("Name"),
    });
    await expect(personRows.nth(0)).toContainText("10.00");
    await expect(personRows.nth(1)).toContainText("10.00");
    await expect(personRows.nth(2)).toContainText("10.00");
    await expect(personRows.nth(3)).toContainText("10.00");
  });

  test("removing all expenses restores manual total input", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add expense" }).click();

    // Manual total input should be gone (replaced by computed total)
    const totalInput = page.locator('input[type="number"].text-xl');
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

    const amountInputs = page
      .locator("li")
      .filter({ has: page.getByPlaceholder("Name") })
      .locator('input[type="number"][placeholder="0.00"]');
    await amountInputs.nth(3).fill("10");

    // Covered = $10.00 (only Faz has an amount set)
    const coveredRow = page.locator("div").filter({ hasText: "Covered" }).last();
    await expect(coveredRow).toContainText("10.00");
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

    await expect(page.getByText("Balanced")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Settle" })
    ).toBeEnabled();
  });
});

test.describe("Settle view", () => {
  test.beforeEach(async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");
  });

  test("Settle tab is disabled until split is balanced", async ({ page }) => {
    // Navigate fresh to get a clean state with no total set
    await page.goto("/");
    const settleBtn = page.getByRole("button", { name: "Settle" });
    await expect(settleBtn).toBeDisabled();

    // Set total to balance the split — Settle should now be enabled
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");
    await expect(settleBtn).toBeEnabled();
  });

  test("shows 'Who paid?' section with all people as payer candidates", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Settle" }).click();
    await expect(page.getByText("Who paid?")).toBeVisible();
    await expect(page.getByText("Set as Payer")).toHaveCount(4);
  });

  test("selecting a payer reorganises the list into two sections", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Settle" }).click();
    await page.getByText("Set as Payer").first().click();
    await expect(page.getByText("Paid by")).toBeVisible();
    await expect(page.getByText("Who owes")).toBeVisible();
    await expect(page.getByText("Set as Payer")).toHaveCount(0);
  });

  test("payer card shows the bill total", async ({ page }) => {
    await page.getByRole("button", { name: "Settle" }).click();
    await page.getByText("Set as Payer").first().click();
    // First person (Rus) is payer; payer card shows store.total (100.00)
    const payerBtn = page
      .locator("button")
      .filter({ hasText: "Rus" })
      .filter({ hasText: "100.00" });
    await expect(payerBtn).toBeVisible();
  });

  test("debtors show individual owed amounts", async ({ page }) => {
    await page.getByRole("button", { name: "Settle" }).click();
    await page.getByText("Set as Payer").first().click();
    const debtorBtns = page.locator("button").filter({ hasText: "owes" });
    await expect(debtorBtns).toHaveCount(3);
    await expect(debtorBtns.nth(0)).toContainText("25.00");
    await expect(debtorBtns.nth(1)).toContainText("25.00");
    await expect(debtorBtns.nth(2)).toContainText("25.00");
  });

  test("clicking a debtor marks them as paid", async ({ page }) => {
    await page.getByRole("button", { name: "Settle" }).click();
    await page.getByText("Set as Payer").first().click();
    const donOwesBtn = page
      .locator("button")
      .filter({ hasText: "Don" })
      .filter({ hasText: "owes" });
    await donOwesBtn.click();
    await expect(
      page
        .locator("button")
        .filter({ hasText: "Don" })
        .filter({ hasText: "paid" })
    ).toBeVisible();
    await expect(donOwesBtn).not.toBeVisible();
  });

  test("'To Collect' decreases as debtors are settled", async ({ page }) => {
    await page.getByRole("button", { name: "Settle" }).click();
    await page.getByText("Set as Payer").first().click();
    const toCollectRow = page
      .locator("div")
      .filter({ hasText: "To Collect" })
      .last();
    await expect(toCollectRow).toContainText("75.00");

    await page
      .locator("button")
      .filter({ hasText: "Don" })
      .filter({ hasText: "owes" })
      .click();
    await expect(toCollectRow).toContainText("50.00");

    await page
      .locator("button")
      .filter({ hasText: "Art" })
      .filter({ hasText: "owes" })
      .click();
    await expect(toCollectRow).toContainText("25.00");
  });

  test("settling all debtors shows 'Collected' badge", async ({ page }) => {
    await page.getByRole("button", { name: "Settle" }).click();
    await page.getByText("Set as Payer").first().click();
    for (const name of ["Don", "Art", "Faz"]) {
      await page
        .locator("button")
        .filter({ hasText: name })
        .filter({ hasText: "owes" })
        .click();
    }
    await expect(page.getByText("Collected")).toBeVisible();
    const toCollectRow = page
      .locator("div")
      .filter({ hasText: "To Collect" })
      .last();
    await expect(toCollectRow).toContainText("0.00");
  });

  test("changing payer resets settled state", async ({ page }) => {
    await page.getByRole("button", { name: "Settle" }).click();
    await page.getByText("Set as Payer").first().click();
    // Settle Don (first debtor)
    await page
      .locator("button")
      .filter({ hasText: "Don" })
      .filter({ hasText: "owes" })
      .click();
    // Deselect Rus by clicking the payer card
    await page
      .locator("button")
      .filter({ hasText: "Rus" })
      .filter({ hasText: "100.00" })
      .click();
    // Select Don as new payer (index 1 in "Who paid?" list)
    await page.getByText("Set as Payer").nth(1).click();
    // Rus should now appear as an unsettled debtor
    await expect(
      page
        .locator("button")
        .filter({ hasText: "Rus" })
        .filter({ hasText: "owes" })
    ).toBeVisible();
  });

  test("'Consumption' tab exits settle mode", async ({ page }) => {
    await page.getByRole("button", { name: "Settle" }).click();
    await page.getByText("Set as Payer").first().click();
    await page.getByRole("button", { name: "Consumption" }).click();
    await expect(page.getByText("Balanced")).toBeVisible();
    await expect(page.getByText("Who paid?")).not.toBeVisible();
  });
});

test.describe("Per-item pricing mode", () => {
  test("pricing mode toggle appears only when expenses are added", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: "Total" })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Each" })
    ).not.toBeVisible();
    await page.getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByRole("button", { name: "Total" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Each" })).toBeVisible();
  });

  test("'Each' mode multiplies expense price by assignee count", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    const priceInput = page
      .locator('li input[type="number"][placeholder="0.00"]')
      .first();
    await priceInput.fill("10");
    // All 4 pre-loaded people are auto-assigned; switch to Each mode
    await page.getByRole("button", { name: "Each" }).click();
    // Total = 10 × 4 = 40
    await expect(page.getByText("$40.00")).toBeVisible();
    // Each person owes 40 / 4 = 10.00 in equally mode
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    await expect(personRows.nth(0)).toContainText("10.00");
    await expect(personRows.nth(1)).toContainText("10.00");
    await expect(personRows.nth(2)).toContainText("10.00");
    await expect(personRows.nth(3)).toContainText("10.00");
  });

  test("switching back to 'Total' restores original total", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    const priceInput = page
      .locator('li input[type="number"][placeholder="0.00"]')
      .first();
    await priceInput.fill("10");
    await page.getByRole("button", { name: "Each" }).click();
    await expect(page.getByText("$40.00")).toBeVisible();
    await page.getByRole("button", { name: "Total" }).click();
    await expect(page.getByText("$10.00")).toBeVisible();
  });
});
