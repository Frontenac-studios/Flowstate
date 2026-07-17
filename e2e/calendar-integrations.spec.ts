import { expect, test } from "@playwright/test";

test.describe("Settings → Integrations → Google Calendar", () => {
  test("Integrations tab hosts Google Calendar setup", async ({ page }) => {
    await page.goto("/settings?tab=integrations");

    await expect(page.getByRole("tab", { name: "Integrations" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.getByRole("heading", { name: "Integrations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Google Calendar" })).toBeVisible();
    await expect(page.getByText(/Read-only inbound sync/i)).toBeVisible();
  });

  test("OAuth return deep-link opens Integrations with flash", async ({ page }) => {
    await page.goto("/settings?calendar=error&reason=access_denied");

    await expect(page.getByRole("tab", { name: "Integrations" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(
      page.getByRole("alert").filter({
        hasText: /access was not granted|Connection failed|Google Calendar/i,
      })
    ).toBeVisible();
    await expect(page).toHaveURL(/tab=integrations/);
  });

  test("connect redirects to Google when OAuth is configured", async ({ page, request }) => {
    const connectionRes = await request.get(
      "/api/trpc/calendar.connections.get?batch=1&input=" +
        encodeURIComponent(JSON.stringify({ "0": { json: null } }))
    );
    expect(connectionRes.ok()).toBeTruthy();
    const connectionJson = (await connectionRes.json()) as Array<{
      result?: { data?: { json?: { configured?: boolean; connected?: boolean } } };
    }>;
    const connection = connectionJson[0]?.result?.data?.json;
    expect(connection).toBeTruthy();

    const connectRes = await request.get("/api/calendar/google/connect", {
      maxRedirects: 0,
    });
    expect([302, 307]).toContain(connectRes.status());
    const location = connectRes.headers().location ?? "";

    await page.goto("/settings?tab=integrations");
    await expect(page.getByRole("heading", { name: "Google Calendar" })).toBeVisible();

    if (!connection?.configured) {
      await expect(page.getByText(/OAuth is not configured/i)).toBeVisible();
      expect(location).toContain("reason=not_configured");
      return;
    }

    if (connection.connected) {
      await expect(page.getByText(/Connected as/i)).toBeVisible();
      return;
    }

    await expect(page.getByTestId("calendar-connect-button")).toBeVisible();
    expect(location).toContain("accounts.google.com");
    expect(location).toContain("calendar.readonly");
    expect(location).toContain("access_type=offline");
    // Desktop / local allowlisted origin should appear in redirect_uri when hitting 127.0.0.1
    expect(location).toMatch(/redirect_uri=.*calendar%2Fgoogle%2Fcallback/);
  });
});
