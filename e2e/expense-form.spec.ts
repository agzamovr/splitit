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

  test("shows pre-loaded people with correct amounts", async ({ page }) => {
    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(4);
    await expect(nameInputs.nth(0)).toHaveValue("Alex");
    await expect(nameInputs.nth(1)).toHaveValue("Jordan");
    await expect(nameInputs.nth(2)).toHaveValue("Sam");
    await expect(nameInputs.nth(3)).toHaveValue("Riley");

    const amountInputs = page.locator(
      '.space-y-2 input[type="number"][placeholder="0.00"]'
    );
    await expect(amountInputs.nth(0)).toHaveValue("24.50");
    await expect(amountInputs.nth(1)).toHaveValue("18.00");
    await expect(amountInputs.nth(2)).toHaveValue("32.75");
    await expect(amountInputs.nth(3)).toHaveValue("");
  });

  test("displays correct avatar initials", async ({ page }) => {
    const avatars = page.locator(
      ".rounded-full.bg-gradient-to-br"
    );
    await expect(avatars.nth(0)).toHaveText("A");
    await expect(avatars.nth(1)).toHaveText("J");
    await expect(avatars.nth(2)).toHaveText("S");
    await expect(avatars.nth(3)).toHaveText("R");
  });

  test("shows editable manual total input", async ({ page }) => {
    const totalInput = page.locator(
      'input[type="number"].text-3xl'
    );
    await expect(totalInput).toBeVisible();
    await expect(totalInput).toHaveValue("");
  });

  test("shows covered amount as sum of person amounts", async ({ page }) => {
    await expect(page.getByText("$75.25").first()).toBeVisible();
  });

  test("submit button is disabled initially", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Save Split" })
    ).toBeDisabled();
  });
});

test.describe("Manual total", () => {
  test("balanced when manual total equals covered amount", async ({
    page,
  }) => {
    const totalInput = page.locator(
      'input[type="number"].text-3xl'
    );
    await totalInput.fill("75.25");
    await expect(page.getByText("Perfectly split!")).toBeVisible();
  });

  test("shows underpaid status when total exceeds covered", async ({
    page,
  }) => {
    const totalInput = page.locator(
      'input[type="number"].text-3xl'
    );
    await totalInput.fill("100");
    await expect(page.getByText("$24.75 left to cover")).toBeVisible();
  });
});

test.describe("Expense items", () => {
  test("first expense inherits manual total value", async ({ page }) => {
    const totalInput = page.locator(
      'input[type="number"].text-3xl'
    );
    await totalInput.fill("42.50");
    await page.getByRole("button", { name: "Add expense" }).click();

    const expensePrice = page.locator(
      'ul input[type="number"][placeholder="0.00"]'
    ).first();
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

    const priceInput = page.locator(
      'li input[type="number"][placeholder="0.00"]'
    ).first();
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

    await page.getByRole("button", { name: "Remove expense" }).first().click();

    await expect(page.getByText("$20.00").first()).toBeVisible();
  });

  test("toggling split type changes icon aria-label", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();

    const splitBtn = page.getByRole("button", {
      name: "Split equally — click to change",
    });
    await expect(splitBtn).toBeVisible();

    await splitBtn.click();

    await expect(
      page.getByRole("button", {
        name: "Not split equally — click to change",
      })
    ).toBeVisible();
  });

  test("removing all expenses restores manual total input", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add expense" }).click();

    // Manual total input should be gone (replaced by computed total)
    const totalInput = page.locator(
      'input[type="number"].text-3xl'
    );
    await expect(totalInput).toBeHidden();

    await page.getByRole("button", { name: "Remove expense" }).click();

    // Manual total input should reappear
    await expect(totalInput).toBeVisible();
  });
});

test.describe("People management", () => {
  test("adding a person increments count and shows ? avatar", async ({
    page,
  }) => {
    await expect(page.getByText("4 people")).toBeVisible();

    await page.getByRole("button", { name: "Add Person" }).click();

    await expect(page.getByText("5 people")).toBeVisible();
    const avatars = page.locator(
      ".rounded-full.bg-gradient-to-br"
    );
    await expect(avatars.nth(4)).toHaveText("?");
  });

  test("removing a person decrements count", async ({ page }) => {
    await expect(page.getByText("4 people")).toBeVisible();
    await page
      .getByRole("button", { name: "Remove person" })
      .first()
      .click();
    await expect(page.getByText("3 people")).toBeVisible();
  });

  test("editing name updates avatar initial", async ({ page }) => {
    const nameInputs = page.getByPlaceholder("Name");
    await nameInputs.nth(0).fill("Bella");

    const avatars = page.locator(
      ".rounded-full.bg-gradient-to-br"
    );
    await expect(avatars.nth(0)).toHaveText("B");
  });

  test("editing person amount updates covered total", async ({ page }) => {
    // Initial covered: $75.25 (24.50 + 18.00 + 32.75 + 0)
    const amountInputs = page.locator(
      '.space-y-2 input[type="number"][placeholder="0.00"]'
    );
    await amountInputs.nth(3).fill("10");

    // New covered: $85.25
    await expect(page.getByText("$85.25").first()).toBeVisible();
  });

  test('shows singular "person" label when only one person', async ({
    page,
  }) => {
    // Remove 3 of 4 people
    await page
      .getByRole("button", { name: "Remove person" })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Remove person" })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Remove person" })
      .first()
      .click();

    await expect(page.getByText("1 person")).toBeVisible();
  });
});

test.describe("Balance badges", () => {
  test('shows "Perfectly split!" when balanced', async ({ page }) => {
    const totalInput = page.locator(
      'input[type="number"].text-3xl'
    );
    await totalInput.fill("75.25");
    await expect(page.getByText("Perfectly split!")).toBeVisible();
  });

  test('shows "Over by $X" when covered exceeds total', async ({ page }) => {
    const totalInput = page.locator(
      'input[type="number"].text-3xl'
    );
    await totalInput.fill("50");
    await expect(page.getByText("Over by $25.25")).toBeVisible();
  });

  test('shows "$X left to cover" when underpaid', async ({ page }) => {
    const totalInput = page.locator(
      'input[type="number"].text-3xl'
    );
    await totalInput.fill("100");
    await expect(page.getByText("$24.75 left to cover")).toBeVisible();
  });
});

test.describe("Submit button", () => {
  test("enabled when balanced and people exist, disabled otherwise", async ({
    page,
  }) => {
    const submitBtn = page.getByRole("button", { name: "Save Split" });
    await expect(submitBtn).toBeDisabled();

    // Balance it
    const totalInput = page.locator(
      'input[type="number"].text-3xl'
    );
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
  test("add people, add itemized expenses, balance, and verify submit", async ({
    page,
  }) => {
    // Remove all pre-loaded people
    for (let i = 0; i < 4; i++) {
      await page
        .getByRole("button", { name: "Remove person" })
        .first()
        .click();
    }
    await expect(page.getByText("0 people")).toBeVisible();

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

    // Set person amounts — scope to rows that have a Name input
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
