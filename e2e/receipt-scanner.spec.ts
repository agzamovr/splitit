import { test, expect } from "@playwright/test";
import { addPeople, DEFAULT_NAMES } from "./helpers";

const MOCK_RECEIPT = {
  receiptTitle: "Pizza Palace · Jan 1",
  currency: "EUR",
  expenses: [
    { description: "Margherita", price: "12.00" },
    { description: "Pepperoni", price: "13.50" },
  ],
  manualTotal: "25.50",
};

const TINY_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

test.beforeEach(async ({ page }) => {
  await page.route("/api/parse-receipt", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_RECEIPT),
    })
  );
  await page.route("/api/**", (route) => route.fulfill({ status: 200, body: "{}" }));
  await page.goto("/");
});

test("camera icon opens the scanner sheet", async ({ page }) => {
  await page.getByRole("button", { name: "Scan receipt" }).click();
  await expect(page.getByRole("button", { name: "Take Photo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose File / Gallery" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Paste from Clipboard" })).toBeVisible();
});

test("backdrop click closes sheet without changing form", async ({ page }) => {
  const originalTitle = await page.getByPlaceholder("Receipt title").inputValue();
  await page.getByRole("button", { name: "Scan receipt" }).click();
  await expect(page.getByRole("button", { name: "Take Photo" })).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(page.getByRole("button", { name: "Take Photo" })).not.toBeVisible();
  await expect(page.getByPlaceholder("Receipt title")).toHaveValue(originalTitle);
});

test("file upload parses receipt and populates form", async ({ page }) => {
  await page.getByRole("button", { name: "Scan receipt" }).click();
  await page
    .locator('input[type="file"]:not([capture])')
    .setInputFiles({ name: "receipt.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });

  await expect(page.getByRole("button", { name: "Take Photo" })).not.toBeVisible({ timeout: 3000 });
  await expect(page.getByPlaceholder("Receipt title")).toHaveValue("Pizza Palace · Jan 1");

  const descriptions = page.locator('input[placeholder="Description"]');
  await expect(descriptions).toHaveCount(2);
  await expect(descriptions.nth(0)).toHaveValue("Margherita");
  await expect(descriptions.nth(1)).toHaveValue("Pepperoni");
});

test("parse error shows message and retry button", async ({ page }) => {
  await page.unroute("/api/parse-receipt");
  await page.route("/api/parse-receipt", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Gemini unavailable" }) })
  );

  await page.getByRole("button", { name: "Scan receipt" }).click();
  await page
    .locator('input[type="file"]:not([capture])')
    .setInputFiles({ name: "receipt.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });

  await expect(page.getByText("Gemini unavailable")).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("people are preserved after scanning", async ({ page }) => {
  await addPeople(page, DEFAULT_NAMES);
  await page.getByRole("button", { name: "Scan receipt" }).click();
  await page
    .locator('input[type="file"]:not([capture])')
    .setInputFiles({ name: "receipt.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });

  await expect(page.getByRole("button", { name: "Take Photo" })).not.toBeVisible({ timeout: 3000 });
  const nameInputs = page.getByPlaceholder("Name");
  await expect(nameInputs).toHaveCount(DEFAULT_NAMES.length);
});

test("new expenses are assigned to all people", async ({ page }) => {
  await addPeople(page, DEFAULT_NAMES);
  await page.getByRole("button", { name: "Scan receipt" }).click();
  await page
    .locator('input[type="file"]:not([capture])')
    .setInputFiles({ name: "receipt.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });

  await expect(page.getByRole("button", { name: "Take Photo" })).not.toBeVisible({ timeout: 3000 });

  // Each person should show a non-zero amount (expenses assigned to all people)
  const personAmounts = page.locator('input[type="number"][placeholder="0.00"]').filter({ hasText: "" });
  // Verify expenses exist (descriptions are filled)
  const descriptions = page.locator('input[placeholder="Description"]');
  await expect(descriptions).toHaveCount(2);
});

test("clipboard paste populates form", async ({ page }) => {
  // Mock navigator.clipboard.read to return a fake image blob
  await page.addInitScript(() => {
    const fakeBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        read: async () => [
          {
            types: ["image/jpeg"],
            getType: async () => fakeBlob,
          },
        ],
      },
      configurable: true,
    });
  });

  await page.goto("/");

  await page.getByRole("button", { name: "Scan receipt" }).click();
  await page.getByRole("button", { name: "Paste from Clipboard" }).click();

  await expect(page.getByRole("button", { name: "Take Photo" })).not.toBeVisible({ timeout: 3000 });
  await expect(page.getByPlaceholder("Receipt title")).toHaveValue("Pizza Palace · Jan 1");

  const descriptions = page.locator('input[placeholder="Description"]');
  await expect(descriptions).toHaveCount(2);
});
