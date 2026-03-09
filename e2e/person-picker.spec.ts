import { test, expect, type Page } from "@playwright/test";

async function addPersonViaPicker(page: Page, name: string) {
  await page.getByRole("button", { name: "Add Person" }).click();
  await page.getByPlaceholder("Enter a name…").fill(name);
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Done" }).click();
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
    // No people were added
    await expect(page.getByPlaceholder("Name")).toHaveCount(0);
  });

  test("pressing Enter with empty input does not close the picker", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    const pickerInput = page.getByPlaceholder("Enter a name…");
    await pickerInput.click(); // ensure focus is on the picker input
    await page.keyboard.press("Enter");
    // Picker remains open — empty input should not add or dismiss
    await expect(pickerInput).toBeVisible();
  });

  test("Done button closes the picker", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await expect(page.getByPlaceholder("Enter a name…")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByPlaceholder("Enter a name…")).not.toBeVisible();
  });

  test("Done button is visible when picker opens", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  });
});

test.describe("PersonPicker — adding a custom person", () => {
  test("typing a name shows the 'Add [name]' row", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Charlie");
    await expect(page.getByText('Add "Charlie"')).toBeVisible();
  });

  test("pressing Enter with a typed name adds the person and keeps picker open", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Charlie");
    await page.keyboard.press("Enter");

    // Picker stays open
    await expect(page.getByPlaceholder("Enter a name…")).toBeVisible();
    // Person was added (visible after closing)
    await page.getByRole("button", { name: "Done" }).click();
    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(1);
    await expect(nameInputs.nth(0)).toHaveValue("Charlie");
  });

  test("clicking the 'Add [name]' row adds the person and keeps picker open", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Dana");
    await page.getByText('Add "Dana"').click();

    // Picker stays open
    await expect(page.getByPlaceholder("Enter a name…")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(1);
    await expect(nameInputs.nth(0)).toHaveValue("Dana");
  });

  test("input is cleared after adding a custom name so the next name can be typed", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    await page.getByPlaceholder("Enter a name…").fill("Charlie");
    await page.keyboard.press("Enter");

    // Input should be empty, ready for the next name
    await expect(page.getByPlaceholder("Enter a name…")).toHaveValue("");
  });

  test("person added via picker (no telegramId) has no avatar focus button", async ({ page }) => {
    await addPersonViaPicker(page, "Eve");
    // Avatar button ("Assign expenses to this person") only renders for telegramId people
    await expect(page.getByRole("button", { name: "Assign expenses to this person" })).toHaveCount(0);
  });
});

test.describe("PersonPicker — multi-add (picker stays open)", () => {
  test("can add multiple people in one picker session", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    const pickerInput = page.getByPlaceholder("Enter a name…");

    await pickerInput.fill("Alice");
    await page.keyboard.press("Enter");
    await pickerInput.fill("Bob");
    await page.keyboard.press("Enter");
    await pickerInput.fill("Carol");
    await page.keyboard.press("Enter");

    await page.getByRole("button", { name: "Done" }).click();

    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(3);
    await expect(nameInputs.nth(0)).toHaveValue("Alice");
    await expect(nameInputs.nth(1)).toHaveValue("Bob");
    await expect(nameInputs.nth(2)).toHaveValue("Carol");
  });

  test("clicking 'Add [name]' row multiple times in one session adds all people", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    const pickerInput = page.getByPlaceholder("Enter a name…");

    await pickerInput.fill("Alice");
    await page.getByText('Add "Alice"').click();
    await pickerInput.fill("Bob");
    await page.getByText('Add "Bob"').click();

    await page.getByRole("button", { name: "Done" }).click();

    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(2);
    await expect(nameInputs.nth(0)).toHaveValue("Alice");
    await expect(nameInputs.nth(1)).toHaveValue("Bob");
  });

  test("the picker can still be opened and used multiple times sequentially", async ({ page }) => {
    await addPersonViaPicker(page, "Alice");
    await addPersonViaPicker(page, "Bob");

    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(2);
    await expect(nameInputs.nth(0)).toHaveValue("Alice");
    await expect(nameInputs.nth(1)).toHaveValue("Bob");
  });

  test("backdrop click closes picker mid-session, keeping already-added people", async ({ page }) => {
    await page.getByRole("button", { name: "Add Person" }).click();
    const pickerInput = page.getByPlaceholder("Enter a name…");

    await pickerInput.fill("Alice");
    await page.keyboard.press("Enter");

    // Dismiss via backdrop without clicking Done
    await page.mouse.click(10, 10);
    await expect(pickerInput).not.toBeVisible();

    // Alice was still added
    const nameInputs = page.getByPlaceholder("Name");
    await expect(nameInputs).toHaveCount(1);
    await expect(nameInputs.nth(0)).toHaveValue("Alice");
  });
});

test.describe("PersonPicker — integration with bill calculations", () => {
  test("person added via picker is included in equal split", async ({ page }) => {
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
    await expect(page.getByText("Covered")).toHaveCount(0);

    await addPersonViaPicker(page, "Someone");
    await expect(page.getByText("Covered")).toBeVisible();
    await expect(page.getByText("Remaining")).toBeVisible();
  });

  test("person added via picker is auto-assigned to all existing expenses", async ({ page }) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.locator('li input[type="number"][placeholder="0.00"]').first().fill("50");

    await addPersonViaPicker(page, "Extra");

    // 1 person assigned to the expense; 50 / 1 = 50
    const personRows = page.locator("li", { has: page.getByPlaceholder("Name") });
    await expect(personRows.nth(0)).toContainText("50.00");
  });
});
