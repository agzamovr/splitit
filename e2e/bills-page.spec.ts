import { test, expect } from "@playwright/test";
import { mockTelegram, makeBill } from "./helpers";

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

  test("All/Unpaid/Unbalanced filter toggle renders all three buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Unpaid" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Unbalanced" })).toBeVisible();
  });

  test("'All' filter is active by default", async ({ page }) => {
    await expect(page.getByRole("button", { name: "All" })).toHaveClass(/bg-white/);
    await expect(page.getByRole("button", { name: "Unpaid" })).not.toHaveClass(/bg-white/);
    await expect(page.getByRole("button", { name: "Unbalanced" })).not.toHaveClass(/bg-white/);
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

  test("shows 'Collected' badge when all people have paid", async ({ page }) => {
    const bill = makeBill({
      people: [
        { id: "p1", name: "Alice", amount: "50", paid: "50" },
        { id: "p2", name: "Bob", amount: "50", paid: "50" },
      ],
    });
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await expect(page.locator("li span").filter({ hasText: /^Collected$/ })).toBeVisible();
  });

  test("shows 'Unpaid' badge when nobody has paid", async ({ page }) => {
    // paid="" for all people → sum(paid) = 0 < 100
    const bill = makeBill();
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await expect(page.locator("li span").filter({ hasText: /^Unpaid$/ })).toBeVisible();
  });

  test("shows 'Collected' for empty bill (total = 0)", async ({ page }) => {
    const bill = makeBill({ manualTotal: "0", people: [] });
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await expect(page.locator("li span").filter({ hasText: /^Collected$/ })).toBeVisible();
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

  test("'Unpaid' filter hides collected bills and shows 'No unpaid bills' when all are collected", async ({
    page,
  }) => {
    // all paid → collected
    const bill = makeBill({
      people: [
        { id: "p1", name: "Alice", amount: "50", paid: "50" },
        { id: "p2", name: "Bob", amount: "50", paid: "50" },
      ],
    });
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await page.getByRole("button", { name: "Unpaid", exact: true }).click();
    await expect(page.getByText("No unpaid bills")).toBeVisible();
    await expect(page.getByText("Pizza night")).not.toBeVisible();
  });

  test("'Unpaid' filter shows only uncollected bills", async ({ page }) => {
    const collected = makeBill({
      id: "b1",
      receiptTitle: "Fully Paid",
      people: [
        { id: "p1", name: "Alice", amount: "50", paid: "50" },
        { id: "p2", name: "Bob", amount: "50", paid: "50" },
      ],
    });
    const uncollected = makeBill({ id: "b2", receiptTitle: "Overdue" }); // paid="" → uncollected
    await page.route("/api/bills", (route) => route.fulfill({ json: [collected, uncollected] }));
    await page.goto("/bills");
    await page.getByRole("button", { name: "Unpaid", exact: true }).click();
    await expect(page.locator("ul li").filter({ hasText: "Overdue" })).toBeVisible();
    await expect(page.locator("ul li").filter({ hasText: "Fully Paid" })).not.toBeVisible();
  });

  test("'All' filter shows all bills after switching from Unpaid", async ({ page }) => {
    const collected = makeBill({
      id: "b1",
      receiptTitle: "Fully Paid",
      people: [
        { id: "p1", name: "Alice", amount: "50", paid: "50" },
        { id: "p2", name: "Bob", amount: "50", paid: "50" },
      ],
    });
    const uncollected = makeBill({ id: "b2", receiptTitle: "Overdue" });
    await page.route("/api/bills", (route) => route.fulfill({ json: [collected, uncollected] }));
    await page.goto("/bills");
    await page.getByRole("button", { name: "Unpaid", exact: true }).click();
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.locator("ul li").filter({ hasText: "Fully Paid" })).toBeVisible();
    await expect(page.locator("ul li").filter({ hasText: "Overdue" })).toBeVisible();
  });

  test("'Unbalanced' filter shows only bills where split amounts don't add up", async ({ page }) => {
    const balanced = makeBill({ id: "b1", receiptTitle: "Even Split" }); // 50+50=100 ✓
    const unbalanced = makeBill({
      id: "b2",
      receiptTitle: "Bad Split",
      people: [{ id: "p1", name: "Alice", amount: "30", paid: "" }], // 30 ≠ 100
    });
    await page.route("/api/bills", (route) => route.fulfill({ json: [balanced, unbalanced] }));
    await page.goto("/bills");
    await page.getByRole("button", { name: "Unbalanced", exact: true }).click();
    await expect(page.locator("ul li").filter({ hasText: "Bad Split" })).toBeVisible();
    await expect(page.locator("ul li").filter({ hasText: "Even Split" })).not.toBeVisible();
  });

  test("'Unbalanced' filter shows 'No unbalanced bills' when all are balanced", async ({ page }) => {
    const bill = makeBill(); // 50+50=100 → balanced
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await page.getByRole("button", { name: "Unbalanced", exact: true }).click();
    await expect(page.getByText("No unbalanced bills")).toBeVisible();
  });

  test("'All' filter shows all bills after switching from Unbalanced", async ({ page }) => {
    const balanced = makeBill({ id: "b1", receiptTitle: "Even Split" });
    const unbalanced = makeBill({
      id: "b2",
      receiptTitle: "Bad Split",
      people: [{ id: "p1", name: "Alice", amount: "30", paid: "" }],
    });
    await page.route("/api/bills", (route) => route.fulfill({ json: [balanced, unbalanced] }));
    await page.goto("/bills");
    await page.getByRole("button", { name: "Unbalanced", exact: true }).click();
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.locator("ul li").filter({ hasText: "Even Split" })).toBeVisible();
    await expect(page.locator("ul li").filter({ hasText: "Bad Split" })).toBeVisible();
  });

  test("no 'Delete All' button in header", async ({ page }) => {
    const bill = makeBill();
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/bills");
    await expect(page.getByTitle("Delete all bills")).not.toBeVisible();
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

// ─── Bills list: loading state ────────────────────────────────────────────────

test.describe("Bills list — loading state", () => {
  test("shows 'Loading…' while API is pending in Telegram context", async ({ page }) => {
    await mockTelegram(page);
    let resolveRoute!: () => void;
    const held = new Promise<void>((res) => { resolveRoute = res; });
    await page.route("/api/bills", async (route) => {
      if (route.request().method() === "GET") {
        await held;
        await route.fulfill({ json: [] });
      } else {
        await route.continue();
      }
    });
    await page.goto("/bills");
    await expect(page.getByText("Loading…")).toBeVisible();
    resolveRoute();
    await expect(page.getByText("No bills yet")).toBeVisible();
  });
});

// ─── Bills list: delete per-bill ─────────────────────────────────────────────

test.describe("Bills list — delete per-bill", () => {
  const bill = makeBill({ id: "del1", receiptTitle: "To Delete" });

  test.beforeEach(async ({ page }) => {
    await mockTelegram(page);
    await page.route("/api/bills", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: [bill] });
      return route.continue();
    });
    await page.goto("/bills");
    await expect(page.getByText("To Delete")).toBeVisible();
  });

  test("trash icon appears for each bill", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Delete bill" })).toBeVisible();
  });

  test("clicking trash shows Delete/Cancel confirm buttons", async ({ page }) => {
    await page.locator('button[aria-label="Delete bill"]').click();
    await expect(page.getByRole("button", { name: "Delete", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
  });

  test("Cancel hides the confirm buttons", async ({ page }) => {
    await page.locator('button[aria-label="Delete bill"]').click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.locator('button[aria-label="Delete bill"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete", exact: true })).not.toBeVisible();
  });

  test("Delete removes bill optimistically", async ({ page }) => {
    await page.route("/api/bills/del1", (route) => {
      if (route.request().method() === "DELETE") return route.fulfill({ json: {} });
      return route.continue();
    });
    // After a successful delete, the onSettled refetch should return empty
    await page.route("/api/bills", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: [] });
      return route.continue();
    });
    await page.locator('button[aria-label="Delete bill"]').click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("To Delete")).not.toBeVisible();
    await expect(page.getByText("No bills yet")).toBeVisible();
  });

  test("bill reappears after DELETE failure (rollback)", async ({ page }) => {
    await page.route("/api/bills/del1", (route) => {
      if (route.request().method() === "DELETE") return route.fulfill({ status: 500, body: "error" });
      return route.continue();
    });
    await page.locator('button[aria-label="Delete bill"]').click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    // onError restores previous cache, onSettled refetches — bill returns
    await expect(page.getByText("To Delete")).toBeVisible({ timeout: 3000 });
  });
});

// ─── "+ New" button on /bills ─────────────────────────────────────────────────

test.describe("New Bill button on /bills", () => {
  test("visible and navigates to /", async ({ page }) => {
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));
    await page.goto("/bills");
    const btn = page.getByRole("button", { name: "New bill" });
    await expect(btn).toBeVisible();
    let navigatedUrl = "";
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigatedUrl = frame.url();
    });
    await btn.click();
    expect(navigatedUrl).toMatch(/\/$/);
  });
});
