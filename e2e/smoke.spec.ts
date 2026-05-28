import { test, expect } from "@playwright/test";

/** Quick-input submit and RDM shortcuts accept Meta or Control. */
const mod = "ControlOrMeta";

function isTrpcResponse(res: { ok: () => boolean; url: () => string }, procedure: string) {
  return res.ok() && res.url().includes("/api/trpc") && res.url().includes(procedure);
}

test("planner smoke: login session, capture, Top 3, RDM focus, done", async ({ page }) => {
  test.setTimeout(90_000);

  const taskTitle = `E2E smoke ${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);

  await page.addInitScript(
    ({ skippedKey, mondayKey, today: localToday }) => {
      localStorage.setItem(skippedKey, localToday);
      localStorage.setItem(mondayKey, localToday);
    },
    {
      skippedKey: "kash.eod.skippedDate",
      mondayKey: "kash.plan.mondayChoiceDate",
      today,
    }
  );

  await page.goto("/plan");

  const mondayCta = page.getByRole("button", { name: "Jump into today" });
  if (await mondayCta.isVisible().catch(() => false)) {
    await mondayCta.click();
  }

  const todaySection = page.getByRole("region", { name: /^Today/i });
  const composer = page.locator("#kash-quick-input");
  await composer.click();
  await composer.fill(taskTitle);

  const createResponse = page.waitForResponse((res) => isTrpcResponse(res, "tasks.create"), {
    timeout: 20_000,
  });
  const listRefresh = page.waitForResponse((res) => isTrpcResponse(res, "listIncomplete"), {
    timeout: 25_000,
  });
  await composer.press(`${mod}+Enter`);
  await createResponse;
  await listRefresh.catch(() => {});
  await expect(composer).toHaveValue("", { timeout: 15_000 });
  await composer.blur();

  const taskRow = todaySection.getByRole("listitem").filter({ hasText: taskTitle });
  await expect.poll(async () => taskRow.isVisible(), { timeout: 25_000 }).toBe(true);
  await expect(taskRow).toBeVisible();

  await taskRow.click();
  const pinResponse = page.waitForResponse((res) => isTrpcResponse(res, "tasks.pinTop3"), {
    timeout: 20_000,
  });
  await page.keyboard.press(`${mod}+1`);
  await pinResponse;
  await expect(taskRow.getByLabel("Top 3")).toBeVisible({ timeout: 10_000 });

  await page.keyboard.press(`${mod}+KeyD`);
  await expect(page).toHaveURL(/\/plan\/focus\?taskId=/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: taskTitle })).toBeVisible({
    timeout: 30_000,
  });

  await page.waitForResponse((res) => isTrpcResponse(res, "timeEntries.start"), {
    timeout: 30_000,
  });

  const completeResponse = page.waitForResponse((res) => isTrpcResponse(res, "tasks.complete"), {
    timeout: 45_000,
  });
  await page.getByRole("button", { name: /^Done/ }).click();
  await completeResponse;

  await page.goto("/plan");
  await expect(todaySection.getByText(taskTitle)).toHaveCount(0, { timeout: 15_000 });
});
