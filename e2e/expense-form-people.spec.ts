import { test, expect } from "@playwright/test";
import { addPeople, DEFAULT_NAMES } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/new");
});

test.describe("People management", () => {
  test.beforeEach(async ({ page }) => {
    await addPeople(page, DEFAULT_NAMES);
  });

  test("adding a person via picker adds them to the list", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Bella");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Done" }).click();

    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(5);
    await expect(nameInputs.nth(4)).toHaveValue("Bella");
  });

  test("name input is editable", async ({ page }) => {
    const nameInputs = page.getByPlaceholder("Name");
    await nameInputs.nth(0).fill("Bella");
    await expect(nameInputs.nth(0)).toHaveValue("Bella");
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

test.describe("Summary section visibility", () => {
  test("Covered and Remaining rows are hidden when no people are added", async ({ page }) => {
    await expect(page.getByText("Covered")).toHaveCount(0);
    await expect(page.getByText("Remaining")).toHaveCount(0);
  });

  test("Covered and Remaining rows appear once a person is added", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Someone");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText("Covered")).toBeVisible();
    await expect(page.getByText("Remaining")).toBeVisible();
  });
});
