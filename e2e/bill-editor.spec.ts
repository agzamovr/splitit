import { test, expect } from "@playwright/test";
import { mockTelegram, mockWebSession } from "./helpers";

// ─── Save indicator ───────────────────────────────────────────────────────────

test.describe("Save indicator", () => {
  test.beforeEach(async ({ page }) => {
    await mockTelegram(page);
    await page.route("/api/bills", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ json: { billId: "test-bill-id" } });
      } else {
        await route.fulfill({ json: [] });
      }
    });
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
    await page.goto("/new");
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
    await mockTelegram(page, 123, { id: 1, type: "group" });
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
    await page.goto("/new");
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

  test("hidden when opened outside a group chat (no initDataUnsafe.chat)", async ({ page }) => {
    // Override with a mock that has no chat property
    await page.route("**/telegram-web-app.js", (route) => route.abort());
    await page.addInitScript((id) => {
      window.Telegram = {
        WebApp: {
          initData: "mock_init_data",
          initDataUnsafe: { user: { id, first_name: "Test" } },
          expand() {}, ready() {}, setHeaderColor() {}, setBackgroundColor() {},
          setBottomBarColor() {}, isVersionAtLeast() { return true; },
          colorScheme: "light" as const, onEvent() {}, sendData() {}, close() {},
          BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
        },
      };
    }, 123);
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
    await page.goto("/new");
    // Wait for the bill to load (title input ready), then assert button is absent
    await expect(page.getByPlaceholder("Receipt title")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Share with Group" })).toHaveCount(0);
  });
});

// ─── "My Bills" breadcrumb ────────────────────────────────────────────────────

test.describe("My Bills breadcrumb", () => {
  test("visible without Telegram context and navigates to /", async ({ page }) => {
    await mockWebSession(page);
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));
    await page.goto("/new");
    const btn = page.getByRole("button", { name: "My Bills" });
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page).toHaveURL("/");
  });

  test("visible in Telegram context and navigates to /", async ({ page }) => {
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
    await page.goto("/new");
    await expect(page.getByRole("button", { name: "My Bills" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "My Bills" }).click();
    await expect(page).toHaveURL("/");
  });

  test("appears above the receipt title input", async ({ page }) => {
    await page.goto("/new");
    const breadcrumb = page.getByRole("button", { name: "My Bills" });
    const titleInput = page.getByPlaceholder("Receipt title");
    await expect(breadcrumb).toBeVisible();
    await expect(titleInput).toBeVisible();
    const breadcrumbBox = await breadcrumb.boundingBox();
    const titleBox = await titleInput.boundingBox();
    expect(breadcrumbBox!.y).toBeLessThan(titleBox!.y);
  });
});

// ─── Web-authenticated users ──────────────────────────────────────────────────

test.describe("Web-authenticated users", () => {
  test("loads existing bill via ?billId URL param", async ({ page }) => {
    await mockWebSession(page);
    await page.route("/api/bills/web-bill-id", (route) =>
      route.fulfill({
        json: {
          id: "web-bill-id", creatorTelegramId: 0, version: 1,
          receiptTitle: "Web Dinner", expenses: [], manualTotal: "42",
          people: [], assignments: {}, splitMode: "equally", currency: "USD",
        },
      }),
    );

    await page.goto("/new?billId=web-bill-id");
    await expect(page.getByPlaceholder("Receipt title")).toHaveValue("Web Dinner", { timeout: 5000 });
  });

  test("creates a new bill when no billId in URL", async ({ page }) => {
    await mockWebSession(page);
    let postCalled = false;
    await page.route("/api/bills", async (route) => {
      if (route.request().method() === "POST") {
        postCalled = true;
        await route.fulfill({ json: { billId: "new-web-bill" } });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    await page.route("/api/bills/new-web-bill", (route) =>
      route.fulfill({
        json: {
          id: "new-web-bill", creatorTelegramId: 0, version: 1,
          receiptTitle: "", expenses: [], manualTotal: "",
          people: [], assignments: {}, splitMode: "equally", currency: "USD",
        },
      }),
    );

    await page.goto("/new");
    await expect(page.getByPlaceholder("Receipt title")).toBeVisible({ timeout: 5000 });
    expect(postCalled).toBe(true);
  });

  test("patches bill when web user edits receipt title", async ({ page }) => {
    await mockWebSession(page);
    await page.route("/api/bills", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ json: { billId: "patch-web-bill" } });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    await page.route("/api/bills/patch-web-bill", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: {
            id: "patch-web-bill", creatorTelegramId: 0, version: 1,
            receiptTitle: "", expenses: [], manualTotal: "",
            people: [], assignments: {}, splitMode: "equally", currency: "USD",
          },
        });
      }
    });

    let patchBody: unknown = null;
    await page.route("**/api/bills/patch-web-bill", async (route) => {
      if (route.request().method() === "PATCH") {
        patchBody = route.request().postDataJSON();
        await route.fulfill({ json: { id: "patch-web-bill", version: 2, receiptTitle: "Lunch", expenses: [], manualTotal: "", people: [], assignments: {}, splitMode: "equally", currency: "USD" } });
      } else {
        await route.continue();
      }
    });

    await page.goto("/new");
    await page.getByPlaceholder("Receipt title").fill("Lunch");
    // Wait for the debounced PATCH to fire (500ms debounce + network)
    await page.waitForResponse(
      (r) => r.url().includes("patch-web-bill") && r.request().method() === "PATCH",
      { timeout: 5000 },
    );
    expect((patchBody as { receiptTitle?: string })?.receiptTitle).toBe("Lunch");
  });
});

// ─── Back button (Telegram) from bill → /bills ────────────────────────────────

test.describe("Back button from bill to /bills", () => {
  test("Telegram back button navigates to / when bill opened via ?billId", async ({ page }) => {
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

    await page.goto("/new?billId=bill-from-list");
    // Trigger the Telegram back button
    await page.evaluate(() => (window as unknown as { __triggerBack?: () => void }).__triggerBack?.());
    await expect(page).toHaveURL("/");
  });
});
