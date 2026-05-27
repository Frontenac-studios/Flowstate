import { test, expect } from "@playwright/test";

/** Quick-input submit and RDM shortcuts accept Meta or Control. */
const mod = "ControlOrMeta";

test("planner smoke: login session, capture, Top 3, RDM focus, done", async ({ page }) => {
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

  const composer = page.locator("#kash-quick-input");
  await composer.click();
  await composer.fill(taskTitle);

  const createResponse = page.waitForResponse(
    (res) => res.ok() && res.url().includes("tasks.create"),
    { timeout: 20_000 }
  );
  await composer.press(`${mod}+Enter`);
  await createResponse;
  await expect(composer).toHaveValue("", { timeout: 15_000 });

  const taskRow = page.getByRole("listitem").filter({ hasText: taskTitle });
  await expect(taskRow).toBeVisible({ timeout: 25_000 });

  await taskRow.click();
  await page.keyboard.press(`${mod}+1`);
  await expect(taskRow.getByLabel("Top 3")).toBeVisible({ timeout: 10_000 });

  await page.keyboard.press(`${mod}+KeyD`);
  await expect(page).toHaveURL(/\/plan\/focus\?taskId=/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: taskTitle })).toBeVisible({
    timeout: 30_000,
  });

  await page.goto("/plan");
  await expect(taskRow).toBeVisible({ timeout: 15_000 });

  const completeResponse = page.waitForResponse(
    (res) => res.ok() && res.url().includes("tasks.complete"),
    { timeout: 20_000 }
  );
  await taskRow.getByRole("checkbox", { name: `Complete ${taskTitle}` }).click();
  await completeResponse;
  await expect(taskRow).toHaveCount(0, { timeout: 15_000 });
});
