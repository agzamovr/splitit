import { test, expect, type Page } from "@playwright/test";

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Inject a mock window.Telegram.WebApp so Telegram-gated features activate. */
async function mockTelegram(page: Page, userId = 123) {
  // Block the real Telegram script so it can't overwrite our mock
  await page.route("**/telegram-web-app.js", (route) => route.abort());
  await page.addInitScript((id) => {
    window.Telegram = {
      WebApp: {
        initData: "mock_init_data",
        initDataUnsafe: { user: { id, first_name: "Test" } },
        expand() {},
        ready() {},
        setHeaderColor() {},
        setBackgroundColor() {},
        setBottomBarColor() {},
        isVersionAtLeast() { return true; },
        colorScheme: "light" as const,
        onEvent() {},
        sendData() {},
        close() {},
        BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
      },
    };
  }, userId);
}

type DeepPartial<T> = { [K in keyof T]?: T[K] };

function makeBill(overrides: DeepPartial<{
  id: string; creatorTelegramId: number; createdAt: number;
  receiptTitle: string; expenses: unknown[]; manualTotal: string;
  people: { id: string; name: string; amount: string; paid: string }[];
  assignments: Record<string, string[]>; splitMode: string;
  currency: string; version: number;
}> = {}) {
  return {
    id: "bill1",
    creatorTelegramId: 123,
    createdAt: Date.now() - 86_400_000,
    receiptTitle: "Pizza night",
    expenses: [],
    manualTotal: "100",
    people: [
      { id: "p1", name: "Alice", amount: "50", paid: "" },
      { id: "p2", name: "Bob", amount: "50", paid: "" },
    ],
    assignments: {},
    splitMode: "amounts",
    currency: "USD",
    version: 1,
    ...overrides,
  };
}

// ─── Bills list page (/bills) ─────────────────────────────────────────────────

test.describe("/bills page — standalone (no Telegram)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bills");
  });

  test("shows 'No bills yet' when no Telegram context", async ({ page }) => {
    await expect(page.getByText("No bills yet")).toBeVisible();
  });

  test("shows '← Back' button and navigates home", async ({ page }) => {
    const back = page.getByRole("button", { name: "← Back" });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL("/");
  });

  test("All/Unpaid filter toggle renders both buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Unpaid" })).toBeVisible();
  });

  test("'All' filter is active by default", async ({ page }) => {
    await expect(page.getByRole("button", { name: "All" })).toHaveClass(/bg-white/);
    await expect(page.getByRole("button", { name: "Unpaid" })).not.toHaveClass(/bg-white/);
  });
});

test.describe("/bills page — with Telegram + mocked API", () => {
  test.beforeEach(async ({ page }) => {
    await mockTelegram(page);
  });

  test("shows 'No bills yet' when API returns empty list", async ({ page }) => {
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));
    await page.goto("/bills");
    await expect(page.getByText("No bills yet")).toBeVisible();
  });

  test("shows bill title and amount", async ({ page }) => {
    const bill = makeBill({ receiptTitle: "Team dinner", manualTotal: "120" });
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await expect(page.getByText("Team dinner")).toBeVisible();
    await expect(page.getByText("120.00")).toBeVisible();
  });

  test("shows 'Balanced' badge for a fully balanced bill (amounts mode)", async ({ page }) => {
    // total = 100, covered = 50 + 50 = 100 → balanced
    const bill = makeBill();
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await expect(page.getByText("Balanced")).toBeVisible();
  });

  test("shows 'Unpaid' badge for an unbalanced bill", async ({ page }) => {
    // total = 100, covered = 30 → not balanced
    const bill = makeBill({
      people: [{ id: "p1", name: "Alice", amount: "30", paid: "" }],
    });
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    // Badge is a span inside the bill row, not the filter button
    await expect(page.locator("li span").filter({ hasText: /^Unpaid$/ })).toBeVisible();
  });

  test("shows 'Balanced' for empty bill (total = 0)", async ({ page }) => {
    const bill = makeBill({ manualTotal: "0", people: [] });
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await expect(page.getByText("Balanced")).toBeVisible();
  });

  test("shows people count in subtitle", async ({ page }) => {
    const bill = makeBill();
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await expect(page.getByText(/2 people/)).toBeVisible();
  });

  test("does not show people count when bill has no people", async ({ page }) => {
    const bill = makeBill({ people: [] });
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await expect(page.getByText(/people/)).not.toBeVisible();
  });

  test("'Unpaid' filter hides balanced bills and shows 'No unpaid bills' when all are balanced", async ({
    page,
  }) => {
    const bill = makeBill(); // balanced
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await page.getByRole("button", { name: "Unpaid", exact: true }).click();
    await expect(page.getByText("No unpaid bills")).toBeVisible();
    await expect(page.getByText("Pizza night")).not.toBeVisible();
  });

  test("'Unpaid' filter shows only unbalanced bills", async ({ page }) => {
    const balanced = makeBill({ id: "b1", receiptTitle: "Settled" });
    const unbalanced = makeBill({
      id: "b2",
      receiptTitle: "Overdue",
      people: [{ id: "p1", name: "Alice", amount: "30", paid: "" }],
    });
    await page.route("/api/bills", (route) => route.fulfill({ json: [balanced, unbalanced] }));
    await page.goto("/bills");
    await page.getByRole("button", { name: "Unpaid", exact: true }).click();
    await expect(page.locator("ul li").filter({ hasText: "Overdue" })).toBeVisible();
    await expect(page.locator("ul li").filter({ hasText: "Settled" })).not.toBeVisible();
  });

  test("'All' filter shows all bills after switching from Unpaid", async ({ page }) => {
    const balanced = makeBill({ id: "b1", receiptTitle: "Settled" });
    const unbalanced = makeBill({
      id: "b2",
      receiptTitle: "Overdue",
      people: [{ id: "p1", name: "Alice", amount: "30", paid: "" }],
    });
    await page.route("/api/bills", (route) => route.fulfill({ json: [balanced, unbalanced] }));
    await page.goto("/bills");
    await page.getByRole("button", { name: "Unpaid", exact: true }).click();
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.locator("ul li").filter({ hasText: "Settled" })).toBeVisible();
    await expect(page.locator("ul li").filter({ hasText: "Overdue" })).toBeVisible();
  });

  test("clicking a bill navigates to /?billId=...", async ({ page }) => {
    const bill = makeBill({ id: "abc99" });
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    // Intercept navigation to avoid actual page load from impeding the test
    let navigatedUrl = "";
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigatedUrl = frame.url();
    });
    await page.goto("/bills");
    await page.getByText("Pizza night").click();
    expect(navigatedUrl).toContain("billId=abc99");
  });

  test("renders multiple bills in order", async ({ page }) => {
    const bills = [
      makeBill({ id: "b1", receiptTitle: "First" }),
      makeBill({ id: "b2", receiptTitle: "Second" }),
    ];
    await page.route("/api/bills", (route) => route.fulfill({ json: bills }));
    await page.goto("/bills");
    const items = page.locator("ul li");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("First");
    await expect(items.nth(1)).toContainText("Second");
  });
});

// ─── Save indicator ───────────────────────────────────────────────────────────

test.describe("Save indicator", () => {
  test.beforeEach(async ({ page }) => {
    await mockTelegram(page);
    // Mock bill creation
    await page.route("/api/bills", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ json: { billId: "test-bill-id" } });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    // Mock polling GET /api/bills/test-bill-id
    await page.route("/api/bills/test-bill-id", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: {
            id: "test-bill-id", creatorTelegramId: 123, version: 1,
            receiptTitle: "", expenses: [], manualTotal: "",
            people: [], assignments: {}, splitMode: "equally", currency: "USD",
          },
        });
      }
    });
    await page.goto("/");
  });

  test("shows 'Save failed' when PATCH returns an error", async ({ page }) => {
    await page.route("**/api/bills/test-bill-id", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 500, body: "Internal Server Error" });
      } else {
        await route.continue();
      }
    });

    const titleInput = page.locator('input[placeholder="Receipt title"]');
    await titleInput.fill("Dinner");
    await expect(page.getByText("Save failed")).toBeVisible({ timeout: 3000 });
  });
});

// ─── Share button ─────────────────────────────────────────────────────────────

test.describe("Share button", () => {
  test.beforeEach(async ({ page }) => {
    await mockTelegram(page);
    await page.route("/api/bills", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ json: { billId: "share-bill-id" } });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    await page.route("/api/bills/share-bill-id", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: {
            id: "share-bill-id", creatorTelegramId: 123, version: 1,
            receiptTitle: "", expenses: [], manualTotal: "100",
            people: [{ id: "p1", name: "Alice", amount: "100", paid: "" }],
            assignments: {}, splitMode: "amounts", currency: "USD",
          },
        });
      }
    });
    await page.goto("/");
    // Wait for bill creation to complete (share button appears)
    await expect(page.getByRole("button", { name: "Share with Group" })).toBeVisible({ timeout: 5000 });
  });

  test("shows 'Sharing…' while request is in flight", async ({ page }) => {
    await page.route("/api/bills/share-bill-id/share", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({ json: {} });
    });
    await page.getByRole("button", { name: "Share with Group" }).click();
    await expect(page.getByText("Sharing…")).toBeVisible();
  });

  test("shows 'Shared!' on success and button is re-enabled after 2s", async ({ page }) => {
    await page.route("/api/bills/share-bill-id/share", (route) =>
      route.fulfill({ json: {} }),
    );
    await page.getByRole("button", { name: "Share with Group" }).click();
    await expect(page.getByText("Shared!")).toBeVisible({ timeout: 3000 });
    // After 2s it resets
    await expect(page.getByRole("button", { name: "Share with Group" })).toBeVisible({ timeout: 4000 });
  });

  test("shows 'Open from a group chat to share' on 400 error", async ({ page }) => {
    await page.route("/api/bills/share-bill-id/share", (route) =>
      route.fulfill({ status: 400, body: "No chat ID provided" }),
    );
    await page.getByRole("button", { name: "Share with Group" }).click();
    await expect(page.getByText("Open from a group chat to share")).toBeVisible({ timeout: 3000 });
  });

  test("shows 'Failed to share' on non-400 error", async ({ page }) => {
    await page.route("/api/bills/share-bill-id/share", (route) =>
      route.fulfill({ status: 500, body: "Server error" }),
    );
    await page.getByRole("button", { name: "Share with Group" }).click();
    await expect(page.getByText("Failed to share")).toBeVisible({ timeout: 3000 });
  });

  test("button is disabled while sharing", async ({ page }) => {
    await page.route("/api/bills/share-bill-id/share", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({ json: {} });
    });
    await page.getByRole("button", { name: "Share with Group" }).click();
    await expect(page.getByRole("button", { name: "Sharing…" })).toBeDisabled();
  });
});

// ─── "My Bills" link ──────────────────────────────────────────────────────────

test.describe("My Bills link", () => {
  test("visible without Telegram context and navigates to /bills", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByRole("button", { name: "My Bills" });
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page).toHaveURL("/bills");
  });

  test("visible in Telegram context and navigates to /bills", async ({ page }) => {
    await mockTelegram(page);
    await page.route("/api/bills", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ json: { billId: "nav-test-id" } });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    await page.route("/api/bills/nav-test-id", (route) =>
      route.fulfill({
        json: {
          id: "nav-test-id", creatorTelegramId: 123, version: 1,
          receiptTitle: "", expenses: [], manualTotal: "", people: [],
          assignments: {}, splitMode: "equally", currency: "USD",
        },
      }),
    );
    await page.goto("/");
    await expect(page.getByRole("button", { name: "My Bills" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "My Bills" }).click();
    await expect(page).toHaveURL("/bills");
  });
});

// ─── "+ New" button on /bills ─────────────────────────────────────────────────

test.describe("New Bill button on /bills", () => {
  test("visible and navigates to /", async ({ page }) => {
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));
    await page.goto("/bills");
    const btn = page.getByRole("button", { name: "+ New" });
    await expect(btn).toBeVisible();
    let navigatedUrl = "";
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigatedUrl = frame.url();
    });
    await btn.click();
    expect(navigatedUrl).toMatch(/\/$/);
  });
});

// ─── Back button (Telegram) from bill → /bills ────────────────────────────────

test.describe("Back button from bill to /bills", () => {
  test("Telegram back button navigates to /bills when bill opened via ?billId", async ({ page }) => {
    // Expose a way to trigger the back button callback from tests
    await page.route("**/telegram-web-app.js", (route) => route.abort());
    await page.addInitScript(() => {
      let _backCb: (() => void) | null = null;
      window.Telegram = {
        WebApp: {
          initData: "mock_init_data",
          initDataUnsafe: { user: { id: 123, first_name: "Test" } },
          expand() {}, ready() {}, setHeaderColor() {}, setBackgroundColor() {},
          setBottomBarColor() {}, isVersionAtLeast() { return true; },
          colorScheme: "light" as const, onEvent() {}, sendData() {}, close() {},
          BackButton: {
            show() {},
            hide() {},
            onClick(cb: () => void) { _backCb = cb; },
            offClick() { _backCb = null; },
          },
        },
      };
      (window as unknown as Record<string, unknown>).__triggerBack = () => _backCb?.();
    });

    await page.route("/api/bills/bill-from-list", (route) =>
      route.fulfill({
        json: {
          id: "bill-from-list", creatorTelegramId: 123, version: 1,
          receiptTitle: "Dinner", expenses: [], manualTotal: "50",
          people: [], assignments: {}, splitMode: "equally", currency: "USD",
        },
      }),
    );

    await page.goto("/?billId=bill-from-list");
    // Trigger the Telegram back button
    await page.evaluate(() => (window as unknown as Record<string, unknown>).__triggerBack?.());
    await expect(page).toHaveURL("/bills");
  });
});
