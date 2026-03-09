import { test, expect } from "@playwright/test";
import { mockTelegram, mockWebSession, makeBill } from "./helpers";

const MOCK_CONFIG = { botId: "9999", botUsername: "TestBot" };

// ─── / redirect guard ─────────────────────────────────────────────────────────

test.describe("/ redirect guard", () => {
  test("unauthenticated browser user sees bills page in dev mode (no redirect)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("No bills yet")).toBeVisible();
  });

  test("Mini App user (Telegram context) reaches / without redirect", async ({ page }) => {
    await mockTelegram(page);
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("No bills yet")).toBeVisible();
  });

  test("web-authenticated user (session in localStorage) reaches / without redirect", async ({
    page,
  }) => {
    await mockWebSession(page);
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("No bills yet")).toBeVisible();
  });

  test("web-authenticated user sees their bills", async ({ page }) => {
    await mockWebSession(page);
    const bill = makeBill({ receiptTitle: "Web Dinner" });
    await page.route("/api/bills", (route) => route.fulfill({ json: [bill] }));
    await page.goto("/");
    await expect(page.getByText("Web Dinner")).toBeVisible();
  });
});

// ─── /login page rendering ────────────────────────────────────────────────────

test.describe("/login page — rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("/api/config", (route) => route.fulfill({ json: MOCK_CONFIG }));
    await page.goto("/login");
  });

  test("shows app name heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "splitit" })).toBeVisible();
  });

  test("shows sign-in description text", async ({ page }) => {
    await expect(
      page.getByText("Sign in with Telegram to access your bills"),
    ).toBeVisible();
  });

  test("shows 'Continue with Telegram' button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Continue with Telegram" })).toBeVisible();
  });

  test("button is enabled once config loads", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Continue with Telegram" })).toBeEnabled();
  });
});

test.describe("/login page — button disabled while config loading", () => {
  test("button is disabled while /api/config is pending", async ({ page }) => {
    let resolveConfig!: () => void;
    const held = new Promise<void>((res) => { resolveConfig = res; });
    await page.route("/api/config", async (route) => {
      await held;
      await route.fulfill({ json: MOCK_CONFIG });
    });
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continue with Telegram" })).toBeDisabled();
    resolveConfig();
    await expect(page.getByRole("button", { name: "Continue with Telegram" })).toBeEnabled();
  });
});

// ─── /login page — already authenticated ─────────────────────────────────────

test.describe("/login page — already authenticated", () => {
  test("redirects to / if session token already in localStorage", async ({ page }) => {
    await mockWebSession(page);
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));
    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });
});

// ─── /login page — Telegram redirect initiation ───────────────────────────────

test.describe("/login page — login initiation", () => {
  test("clicking button sends request to oauth.telegram.org with OIDC params", async ({ page }) => {
    await page.route("/api/config", (route) => route.fulfill({ json: MOCK_CONFIG }));
    await page.route("https://oauth.telegram.org/**", (route) => route.abort());
    await page.goto("/login");

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("oauth.telegram.org")),
      page.getByRole("button", { name: "Continue with Telegram" }).click(),
    ]);

    const url = new URL(request.url());
    expect(url.searchParams.get("bot_id")).toBe(MOCK_CONFIG.botId);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toContain("openid");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("redirect_uri")).toContain("/login");
  });

});

// ─── /login page — OAuth callback (code exchange) ────────────────────────────

test.describe("/login page — OAuth callback", () => {
  test("exchanges code and redirects to / on success", async ({ page }) => {
    // Pre-seed pkce_verifier in sessionStorage
    await page.addInitScript(() => {
      sessionStorage.setItem("pkce_verifier", "test_verifier_abc");
    });

    await page.route("/api/config", (route) => route.fulfill({ json: MOCK_CONFIG }));
    await page.route("/api/auth/exchange", async (route) => {
      const body = await route.request().postDataJSON() as { code: string; code_verifier: string };
      if (body.code === "TESTCODE" && body.code_verifier === "test_verifier_abc") {
        return route.fulfill({ json: { sessionToken: "validtoken.abc123" } });
      }
      return route.fulfill({ status: 401, json: { error: "bad" } });
    });
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));

    await page.goto("/login?code=TESTCODE");
    await expect(page).toHaveURL("/");

    // Session token should be persisted
    const stored = await page.evaluate(() => localStorage.getItem("tg_session"));
    expect(stored).toBe("validtoken.abc123");
  });

  test("shows error message when exchange fails", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("pkce_verifier", "test_verifier_abc");
    });

    await page.route("/api/config", (route) => route.fulfill({ json: MOCK_CONFIG }));
    await page.route("/api/auth/exchange", (route) =>
      route.fulfill({ status: 401, json: { error: "Token exchange failed" } }),
    );

    await page.goto("/login?code=BADCODE");
    await expect(page.getByText("Sign-in failed. Please try again.")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("removes pkce_verifier from sessionStorage after exchange", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("pkce_verifier", "test_verifier_abc");
    });

    await page.route("/api/config", (route) => route.fulfill({ json: MOCK_CONFIG }));
    await page.route("/api/auth/exchange", (route) =>
      route.fulfill({ json: { sessionToken: "tok.sig" } }),
    );
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));

    await page.goto("/login?code=ANYCODE");
    await expect(page).toHaveURL("/");

    const verifier = await page.evaluate(() => sessionStorage.getItem("pkce_verifier"));
    expect(verifier).toBeNull();
  });

  test("cleans ?code= from URL after exchange", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("pkce_verifier", "test_verifier_abc");
    });

    await page.route("/api/config", (route) => route.fulfill({ json: MOCK_CONFIG }));

    // Make exchange hang so we can check URL before redirect
    let resolveExchange!: () => void;
    const held = new Promise<void>((res) => { resolveExchange = res; });
    await page.route("/api/auth/exchange", async (route) => {
      await held;
      await route.fulfill({ json: { sessionToken: "tok.sig" } });
    });

    await page.goto("/login?code=TESTCODE");

    // While exchange is pending, the ?code= should already be gone
    await expect(page).toHaveURL("/login");

    resolveExchange();
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));
    await expect(page).toHaveURL("/");
  });

  test("ignores ?code= if pkce_verifier is missing from sessionStorage", async ({ page }) => {
    // No pkce_verifier seeded — simulates losing the verifier (e.g. tab was closed)
    await page.route("/api/config", (route) => route.fulfill({ json: MOCK_CONFIG }));

    await page.goto("/login?code=ORPHANCODE");

    // Should stay on /login showing the login button (no crash, no redirect to /)
    await expect(page.getByRole("button", { name: "Continue with Telegram" })).toBeVisible();
    // URL may still contain ?code= since the early return skips history.replaceState — that's fine
    await expect(page).not.toHaveURL("/");
  });
});

// ─── /login page — Telegram Mini App passthrough ─────────────────────────────

test.describe("/login page — Telegram Mini App context", () => {
  test("Mini App users visiting /login are not redirected (login page is open)", async ({
    page,
  }) => {
    await mockTelegram(page);
    await page.route("/api/config", (route) => route.fulfill({ json: MOCK_CONFIG }));
    await page.goto("/login");
    // The page doesn't auto-redirect Mini App users away from /login
    // (they can navigate here manually; isWebAuthenticated() is false)
    await expect(page.getByRole("button", { name: "Continue with Telegram" })).toBeVisible();
  });
});

// ─── / (home) — #tgAuthResult hash flow ──────────────────────────────────────

test.describe("/ — #tgAuthResult hash flow", () => {
  const VALID_AUTH = btoa(JSON.stringify({ id: 42, first_name: "Alice", hash: "abc", auth_date: "9999999999" }));

  test("exchanges widget auth and redirects to / on success", async ({ page }) => {
    await page.addInitScript(() => { sessionStorage.setItem("tg_login_pending", "1"); });
    await page.route("/api/auth/widget", (route) =>
      route.fulfill({ json: { sessionToken: "tok.sig" } }),
    );
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));

    await page.goto(`/#tgAuthResult=${VALID_AUTH}`);
    // Wait for the bills page to fully render after the reload triggered by window.location.href = "/"
    await expect(page.getByText("No bills yet")).toBeVisible();
    await expect(page).toHaveURL("/");

    const stored = await page.evaluate(() => localStorage.getItem("tg_session"));
    expect(stored).toBe("tok.sig");
  });

  test("clears tg_login_pending from sessionStorage after exchange", async ({ page }) => {
    // Only seed when the hash is present (initial load), not on the reload after redirect
    await page.addInitScript(() => {
      if (location.hash.startsWith("#tgAuthResult=")) sessionStorage.setItem("tg_login_pending", "1");
    });
    await page.route("/api/auth/widget", (route) =>
      route.fulfill({ json: { sessionToken: "tok.sig" } }),
    );
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));

    await page.goto(`/#tgAuthResult=${VALID_AUTH}`);
    // Wait for the bills page to fully render after the reload triggered by window.location.href = "/"
    await expect(page.getByText("No bills yet")).toBeVisible();
    await expect(page).toHaveURL("/");

    const pending = await page.evaluate(() => sessionStorage.getItem("tg_login_pending"));
    expect(pending).toBeNull();
  });

  test("hash is removed from URL immediately", async ({ page }) => {
    await page.addInitScript(() => { sessionStorage.setItem("tg_login_pending", "1"); });
    let resolveWidget!: () => void;
    const held = new Promise<void>((r) => { resolveWidget = r; });
    await page.route("/api/auth/widget", async (route) => {
      await held;
      await route.fulfill({ json: { sessionToken: "tok.sig" } });
    });

    await page.goto(`/#tgAuthResult=${VALID_AUTH}`);
    // While exchange is pending the hash should already be gone (URL is /, no hash fragment)
    await expect(page).not.toHaveURL(/#tgAuthResult/);
    await expect(page).toHaveURL("/");
    resolveWidget();
    await page.route("/api/bills", (route) => route.fulfill({ json: [] }));
    // After redirect to / (reload with session), still at /
    await expect(page).toHaveURL("/");
  });

  test("ignored (no redirect) when tg_login_pending is absent", async ({ page }) => {
    // No sessionStorage.setItem — simulates stale/orphan hash
    await page.goto(`/#tgAuthResult=${VALID_AUTH}`);
    // Should stay on / showing the bills page, not redirect to /login
    await expect(page).toHaveURL("/");
    await expect(page).not.toHaveURL("/login");
  });

  test("redirects to /login when base64 is invalid", async ({ page }) => {
    await page.addInitScript(() => { sessionStorage.setItem("tg_login_pending", "1"); });
    await page.goto("/#tgAuthResult=NOT_VALID_BASE64!!!");
    await expect(page).toHaveURL("/login");
  });

  test("redirects to /login when JSON has no id field", async ({ page }) => {
    await page.addInitScript(() => { sessionStorage.setItem("tg_login_pending", "1"); });
    const noId = btoa(JSON.stringify({ hash: "abc" }));
    await page.goto(`/#tgAuthResult=${noId}`);
    await expect(page).toHaveURL("/login");
  });

  test("redirects to /login when widget exchange fails", async ({ page }) => {
    await page.addInitScript(() => { sessionStorage.setItem("tg_login_pending", "1"); });
    await page.route("/api/auth/widget", (route) =>
      route.fulfill({ status: 401, json: { error: "Invalid hash" } }),
    );
    await page.goto(`/#tgAuthResult=${VALID_AUTH}`);
    await expect(page).toHaveURL("/login");
  });
});

// ─── / — web auth sends correct Authorization header ──────────────────────────

test.describe("/ — web-authenticated API calls", () => {
  test("requests to /api/bills include TelegramSession header", async ({ page }) => {
    await mockWebSession(page, "mytoken.myhex");

    let authHeader = "";
    await page.route("/api/bills", (route) => {
      authHeader = route.request().headers()["authorization"] ?? "";
      return route.fulfill({ json: [] });
    });

    await page.goto("/");
    await expect(page.getByText("No bills yet")).toBeVisible();
    expect(authHeader).toBe("TelegramSession mytoken.myhex");
  });
});
