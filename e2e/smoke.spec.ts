import { test, expect } from "@playwright/test";

/** Quick-input submit and RDM shortcuts accept Meta or Control. */
const mod = "ControlOrMeta";

function isTrpcResponse(res: { ok: () => boolean; url: () => string }, procedure: string) {
  return res.ok() && res.url().includes("/api/trpc") && res.url().includes(procedure);
}

test("planner smoke: login session, capture, Top 3, RDM focus, done", async ({ page }) => {
  test.setTimeout(120_000);

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

  // Accessible name becomes "Today (N)" once tasks exist — bind to the stable id instead.
  const todaySection = page.locator('section[aria-labelledby="today-heading"]');
  const taskRow = () => todaySection.getByRole("listitem").filter({ hasText: taskTitle });

  const composer = page.locator("#kash-quick-input");
  await composer.click();
  await composer.fill(taskTitle);

  const createResponse = page.waitForResponse((res) => isTrpcResponse(res, "tasks.create"), {
    timeout: 30_000,
  });
  await composer.press(`${mod}+Enter`);
  await createResponse;
  await expect(composer).toHaveValue("", { timeout: 20_000 });
  await composer.blur();
  await expect(taskRow()).toBeVisible({ timeout: 45_000 });

  await taskRow().click();
  const pinResponse = page.waitForResponse((res) => isTrpcResponse(res, "tasks.pinTop3"), {
    timeout: 30_000,
  });
  await page.keyboard.press(`${mod}+1`);
  await pinResponse;
  await expect(taskRow().getByLabel("Top 3")).toBeVisible({ timeout: 15_000 });

  await page.keyboard.press(`${mod}+KeyD`);
  await expect(page).toHaveURL(/\/plan\/focus\?taskId=/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: taskTitle })).toBeVisible({
    timeout: 45_000,
  });

  const completeResponse = page.waitForResponse((res) => isTrpcResponse(res, "tasks.complete"), {
    timeout: 45_000,
  });
  await page.getByRole("button", { name: /^Done/ }).click();
  await completeResponse;

  await page.goto("/plan");
  await expect(todaySection.getByText(taskTitle)).toHaveCount(0, { timeout: 20_000 });
});
