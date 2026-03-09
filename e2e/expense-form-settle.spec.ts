import { test, expect } from "@playwright/test";
import { addPeople, DEFAULT_NAMES } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/new");
  await addPeople(page, DEFAULT_NAMES);
});

test.describe("Settle view", () => {
  test.beforeEach(async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");
  });

  test("Settle tab is disabled until split is balanced", async ({ page }) => {
    // Navigate fresh to get a clean state with no total set
    await page.goto("/new");
    await addPeople(page, DEFAULT_NAMES);
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

test.describe("Settle view – Own mode", () => {
  test.beforeEach(async ({ page }) => {
    const totalInput = page.locator('input[type="number"].text-xl');
    await totalInput.fill("100");
    await page.getByRole("button", { name: "Settle" }).click();
  });

  test("switcher is visible with 'One Person' active by default", async ({ page }) => {
    await expect(page.getByRole("button", { name: "One Person", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Everyone", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "One Person", exact: true })).toHaveClass(/bg-white/);
    await expect(page.getByRole("button", { name: "Everyone", exact: true })).not.toHaveClass(/bg-white/);
  });

  test("switching to 'Everyone' hides payer selection and shows all four as debtors", async ({ page }) => {
    await page.getByRole("button", { name: "Everyone" }).click();
    await expect(page.getByText("Set as Payer")).toHaveCount(0);
    const debtorBtns = page.locator("button").filter({ hasText: "owes" });
    await expect(debtorBtns).toHaveCount(4);
  });

  test("each person shows the correct individual amount in Everyone mode", async ({ page }) => {
    await page.getByRole("button", { name: "Everyone" }).click();
    const debtorBtns = page.locator("button").filter({ hasText: "owes" });
    await expect(debtorBtns.nth(0)).toContainText("25.00");
    await expect(debtorBtns.nth(1)).toContainText("25.00");
    await expect(debtorBtns.nth(2)).toContainText("25.00");
    await expect(debtorBtns.nth(3)).toContainText("25.00");
  });

  test("'To Collect' decreases as people are marked paid in Everyone mode", async ({ page }) => {
    await page.getByRole("button", { name: "Everyone" }).click();
    const toCollectRow = page.locator("div").filter({ hasText: "To Collect" }).last();
    await expect(toCollectRow).toContainText("100.00");
    await page.locator("button").filter({ hasText: "Rus" }).filter({ hasText: "owes" }).click();
    await expect(toCollectRow).toContainText("75.00");
    await page.locator("button").filter({ hasText: "Don" }).filter({ hasText: "owes" }).click();
    await expect(toCollectRow).toContainText("50.00");
  });

  test("'Collected' badge appears when all four are marked paid in Everyone mode", async ({ page }) => {
    await page.getByRole("button", { name: "Everyone" }).click();
    for (const name of ["Rus", "Don", "Art", "Faz"]) {
      await page.locator("button").filter({ hasText: name }).filter({ hasText: "owes" }).click();
    }
    await expect(page.getByText("Collected")).toBeVisible();
    const toCollectRow = page.locator("div").filter({ hasText: "To Collect" }).last();
    await expect(toCollectRow).toContainText("0.00");
  });

  test("switching Everyone → One Person resets settled state", async ({ page }) => {
    await page.getByRole("button", { name: "Everyone" }).click();
    await page.locator("button").filter({ hasText: "Rus" }).filter({ hasText: "owes" }).click();
    await page.locator("button").filter({ hasText: "Don" }).filter({ hasText: "owes" }).click();
    await page.getByRole("button", { name: "One Person", exact: true }).click();
    await expect(page.getByText("Set as Payer")).toHaveCount(4);
  });

  test("sub-mode persists when switching Settle → Consumption → Settle", async ({ page }) => {
    await page.getByRole("button", { name: "Everyone" }).click();
    await expect(page.getByRole("button", { name: "Everyone" })).toHaveClass(/bg-white/);
    await page.getByRole("button", { name: "Consumption" }).click();
    await expect(page.getByText("Balanced")).toBeVisible();
    await page.getByRole("button", { name: "Settle" }).click();
    await expect(page.getByRole("button", { name: "Everyone" })).toHaveClass(/bg-white/);
  });
});
