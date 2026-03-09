import { test, expect } from "@playwright/test";
import { addPeople, DEFAULT_NAMES } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await addPeople(page, DEFAULT_NAMES);
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

test.describe("Per-item pricing mode", () => {
  test("pricing mode toggle appears in header only when an expense item is active", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: "Total" })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Each" })
    ).not.toBeVisible();
    await page.getByRole("button", { name: "Add expense" }).click();
    // Adding an expense auto-focuses the description input; click a person row to
    // defocus it so we can verify the switcher is hidden without an active row.
    await page.getByPlaceholder("Name").first().click();
    await expect(
      page.getByRole("button", { name: "Total" })
    ).not.toBeVisible();
    // Activate the item by clicking the people icon
    await page.getByRole("button", { name: "Assign people to this expense" }).click();
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
    // Activate the item, switch to Each mode, then exit item mode
    await page.getByRole("button", { name: "Assign people to this expense" }).click();
    await page.getByRole("button", { name: "Each" }).click();
    await page.getByRole("button", { name: "Assign people to this expense" }).click();
    // Total = 10 × 4 = 40
    await expect(page.getByText("$40.00")).toBeVisible();
    // Each person owes 10.00 (each × 1 person in equally mode: 40 / 4 = 10)
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
    // Activate the item and switch to Each mode
    await page.getByRole("button", { name: "Assign people to this expense" }).click();
    await page.getByRole("button", { name: "Each" }).click();
    await expect(page.getByText("$40.00")).toBeVisible();
    await page.getByRole("button", { name: "Total" }).click();
    await expect(page.getByText("$10.00")).toBeVisible();
  });

  test("switcher appears when description input is focused", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    // Defocus the auto-focused description input before asserting switcher is hidden
    await page.getByPlaceholder("Name").first().click();
    await expect(page.getByRole("button", { name: "Total" })).not.toBeVisible();
    await page.getByPlaceholder("Description").first().click();
    await expect(page.getByRole("button", { name: "Total" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Each" })).toBeVisible();
  });

  test("switcher appears when price input is focused", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    // Defocus the auto-focused description input before asserting switcher is hidden
    await page.getByPlaceholder("Name").first().click();
    await expect(page.getByRole("button", { name: "Total" })).not.toBeVisible();
    await page.locator('li input[type="number"][placeholder="0.00"]').first().click();
    await expect(page.getByRole("button", { name: "Total" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Each" })).toBeVisible();
  });

  test("switcher hides when focus leaves the expense row", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByPlaceholder("Description").first().click();
    await expect(page.getByRole("button", { name: "Total" })).toBeVisible();
    // Move focus outside the expense row to a person's name input
    await page.getByPlaceholder("Name").first().click();
    await expect(page.getByRole("button", { name: "Total" })).not.toBeVisible();
  });

  test("item label defaults to 'tot' and changes to 'ea' when Each is enabled", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    const expenseRow = page
      .locator("li")
      .filter({ has: page.getByPlaceholder("Description") })
      .first();
    await expect(expenseRow).toContainText("tot");
    await page.getByRole("button", { name: "Assign people to this expense" }).click();
    await page.getByRole("button", { name: "Each" }).click();
    await expect(expenseRow).toContainText("ea");
  });

  test("two items have independent pricing modes", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByRole("button", { name: "Add expense" }).click();
    const expenseRows = page
      .locator("li")
      .filter({ has: page.getByPlaceholder("Description") });
    // Switch first item to Each
    await page.getByRole("button", { name: "Assign people to this expense" }).first().click();
    await page.getByRole("button", { name: "Each" }).click();
    // Exit item mode
    await page.getByRole("button", { name: "Assign people to this expense" }).first().click();
    // First item shows "ea", second still shows "tot"
    await expect(expenseRows.first()).toContainText("ea");
    await expect(expenseRows.last()).toContainText("tot");
  });

  test("computed total line shows for each-mode items with assigned people", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator('li input[type="number"][placeholder="0.00"]').first().fill("10");
    // Switch to Each (all 4 people auto-assigned)
    await page.getByRole("button", { name: "Assign people to this expense" }).click();
    await page.getByRole("button", { name: "Each" }).click();
    // Exit item mode — computed line should appear
    await page.getByRole("button", { name: "Assign people to this expense" }).click();
    // Text contains a thin space between $ and amount, so match loosely
    await expect(page.getByText(/=.*40\.00/)).toBeVisible();
  });

  test("computed total line is absent in total mode", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator('li input[type="number"][placeholder="0.00"]').first().fill("10");
    await expect(page.getByText(/^= \$/).first()).not.toBeVisible();
  });

  test("switcher reflects each-mode item when re-focused after exiting item mode", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    // Enable Each via people icon then exit item mode
    await page.getByRole("button", { name: "Assign people to this expense" }).click();
    await page.getByRole("button", { name: "Each" }).click();
    await page.getByRole("button", { name: "Assign people to this expense" }).click();
    // Focus the price input — switcher should show Each as active (label is "ea")
    await page.locator('li input[type="number"][placeholder="0.00"]').first().click();
    await expect(
      page.locator("li").filter({ has: page.getByPlaceholder("Description") }).first()
    ).toContainText("ea");
    await expect(page.getByRole("button", { name: "Total" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Each" })).toBeVisible();
  });
});

test.describe("Item count per person", () => {
  // Helper: the people-section <ul> is always the last <ul> on the page.
  // (Items <ul> is only rendered in consumption mode when expenses exist.)
  const peopleUl = (page: import("@playwright/test").Page) => page.locator("ul").last();

  test("no item count label in manual total mode (no expense items)", async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");
    await expect(peopleUl(page).locator("span", { hasText: /\d+ items?/ })).toHaveCount(0);
  });

  test("shows '1 item' (singular) for each person when one expense is added", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator('li input[type="number"][placeholder="0.00"]').first().fill("100");
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    await expect(personRows.nth(0)).toContainText("1 item");
    await expect(personRows.nth(1)).toContainText("1 item");
    await expect(personRows.nth(2)).toContainText("1 item");
    await expect(personRows.nth(3)).toContainText("1 item");
  });

  test("uses plural 'items' when assigned to two or more expenses", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByRole("button", { name: "Add expense" }).click();
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    await expect(personRows.nth(0)).toContainText("2 items");
    await expect(personRows.nth(1)).toContainText("2 items");
    await expect(personRows.nth(2)).toContainText("2 items");
    await expect(personRows.nth(3)).toContainText("2 items");
  });

  test("item count differs per person after selective deassignment", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByRole("button", { name: "Add expense" }).click();
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    // All 4 people assigned to both items by default
    await expect(personRows.nth(0)).toContainText("2 items");

    // Enter item mode for the first expense.
    // Pre-focus the button first so the layout shift from onFocus doesn't interrupt the click.
    const assignBtn1 = page.getByRole("button", { name: "Assign people to this expense" }).first();
    await assignBtn1.focus();
    await assignBtn1.click();
    // Verify item mode is active (Deselect All button appears in people section header)
    await expect(page.getByRole("button", { name: "Deselect All" })).toBeVisible();
    // In item mode, use Deselect All then re-select Don/Art/Faz, leaving Rus deselected
    await page.getByRole("button", { name: "Deselect All" }).click();
    // Re-select Don, Art, Faz (all except Rus — the first person)
    await page.locator("ul").last().locator("li").nth(1).locator("button").click();
    await page.locator("ul").last().locator("li").nth(2).locator("button").click();
    await page.locator("ul").last().locator("li").nth(3).locator("button").click();
    // Exit item mode (pre-focus to avoid layout-shift click miss)
    await assignBtn1.focus();
    await assignBtn1.click();

    // Rus is now only in 1 item
    await expect(personRows.nth(0)).toContainText("1 item");
    // Others remain in 2 items
    await expect(personRows.nth(1)).toContainText("2 items");
    await expect(personRows.nth(2)).toContainText("2 items");
    await expect(personRows.nth(3)).toContainText("2 items");
  });

  test("item count label hidden when person has no assigned items", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    // Remove all people from the only expense via Deselect All
    await page.getByRole("button", { name: "Assign people to this expense" }).click();
    await page.getByRole("button", { name: "Deselect All" }).click();
    await page.getByRole("button", { name: "Assign people to this expense" }).click();
    await expect(peopleUl(page).locator("span", { hasText: /\d+ items?/ })).toHaveCount(0);
  });

  test("item count disappears when the expense is removed", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    await expect(personRows.nth(0)).toContainText("1 item");
    await page.getByRole("button", { name: "Remove expense" }).click();
    // After removal the items <ul> is gone; people <ul> is the only ul
    await expect(peopleUl(page).locator("span", { hasText: /\d+ items?/ })).toHaveCount(0);
  });

  test("item count is not visible in settle mode", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator('li input[type="number"][placeholder="0.00"]').first().fill("100");
    // Settle mode hides the items <ul>; only the people <ul> remains
    await page.getByRole("button", { name: "Settle" }).click();
    await expect(peopleUl(page).locator("span", { hasText: /\d+ items?/ })).toHaveCount(0);
  });
});
