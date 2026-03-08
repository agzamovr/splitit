import { test, expect, type Page } from "@playwright/test";

async function addPersonViaPicker(page: Page, name: string) {
  await page.getByRole("button", { name: "Add Person" }).click();
  await page.getByPlaceholder("Enter a name…").fill(name);
  await page.keyboard.press("Enter");
}

test.beforeEach(async ({ page }) => {
  // Silence the fire-and-forget POST to /api/people (no backend in dev)
  await page.route("/api/**", (route) => route.fulfill({ status: 200, body: "{}" }));
  await page.goto("/");
});

test.describe("PersonPicker — opening and closing", () => {
  test("clicking 'Add Person' opens the picker with a text input", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await expect(page.getByPlaceholder("Enter a name…")).toBeVisible();
  });

  test("clicking the backdrop closes the picker without adding anyone", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await expect(page.getByPlaceholder("Enter a name…")).toBeVisible();

    // Click top-left corner — above the bottom sheet, on the backdrop
    await page.mouse.click(10, 10);
    await expect(page.getByPlaceholder("Enter a name…")).not.toBeVisible();
    // Still only 4 sample people
    await expect(page.getByPlaceholder("Name")).toHaveCount(4);
  });

  test("pressing Enter with empty input does not close the picker", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    const pickerInput = page.getByPlaceholder("Enter a name…");
    await pickerInput.click(); // ensure focus is on the picker input
    await page.keyboard.press("Enter");
    // Picker remains open — empty input should not add or dismiss
    await expect(pickerInput).toBeVisible();
  });
});

test.describe("PersonPicker — adding a custom person", () => {
  test("typing a name shows the 'Add [name]' row", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Charlie");
    await expect(page.getByText('Add "Charlie"')).toBeVisible();
  });

  test("pressing Enter with a typed name adds the person and closes the picker", async ({ page }) => {
    await addPersonViaPicker(page, "Charlie");

    await expect(page.getByPlaceholder("Enter a name…")).not.toBeVisible();
    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(5);
    await expect(nameInputs.nth(4)).toHaveValue("Charlie");
  });

  test("clicking the 'Add [name]' row adds the person and closes the picker", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Dana");
    await page.getByText('Add "Dana"').click();

    await expect(page.getByPlaceholder("Enter a name…")).not.toBeVisible();
    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(5);
    await expect(nameInputs.nth(4)).toHaveValue("Dana");
  });

  test("the picker can be opened and used multiple times sequentially", async ({ page }) => {
    await addPersonViaPicker(page, "Alice");
    await addPersonViaPicker(page, "Bob");

    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(6);
    await expect(nameInputs.nth(4)).toHaveValue("Alice");
    await expect(nameInputs.nth(5)).toHaveValue("Bob");
  });

  test("person added via picker (no telegramId) has no avatar focus button", async ({ page }) => {
    await addPersonViaPicker(page, "Eve");
    // Avatar button ("Assign expenses to this person") only renders for telegramId people
    await expect(page.getByRole("button", { name: "Assign expenses to this person" })).toHaveCount(0);
  });
});

test.describe("PersonPicker — integration with bill calculations", () => {
  test("person added via picker is included in equal split", async ({ page }) => {
    // Remove all 4 sample people then add 2 via picker
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "Remove person" }).first().click();
    }
    await addPersonViaPicker(page, "Alice");
    await addPersonViaPicker(page, "Bob");

    await page.locator('input[type="number"].text-xl').fill("100");
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    await expect(personRows.nth(0)).toContainText("50.00");
    await expect(personRows.nth(1)).toContainText("50.00");
    await expect(page.getByText("Balanced")).toBeVisible();
  });

  test("adding a person via picker makes Covered/Remaining appear when all were removed", async ({
    page,
  }) => {
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "Remove person" }).first().click();
    }
    await expect(page.getByText("Covered")).toHaveCount(0);

    await addPersonViaPicker(page, "Someone");
    await expect(page.getByText("Covered")).toBeVisible();
    await expect(page.getByText("Remaining")).toBeVisible();
  });

  test("person added via picker is auto-assigned to all existing expenses", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator('li input[type="number"][placeholder="0.00"]').first().fill("50");

    await addPersonViaPicker(page, "Extra");

    // Now 5 people assigned to the expense; 50 / 5 = 10 each
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    await expect(personRows.nth(4)).toContainText("10.00");
  });
});
