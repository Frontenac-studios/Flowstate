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
  await composer.press(`${mod}+Enter`);
  await expect(composer).toHaveValue("", { timeout: 15_000 });

  const taskRow = page.getByRole("listitem").filter({ hasText: taskTitle });
  await expect(async () => {
    await expect(taskRow).toBeVisible();
  }).toPass({ timeout: 25_000 });

  await taskRow.click();
  await page.keyboard.press(`${mod}+1`);

  await page.keyboard.press(`${mod}+KeyD`);
  await expect(page).toHaveURL(/\/plan\/focus\?taskId=/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible({ timeout: 20_000 });

  await page.goto("/plan");
  await page.getByRole("checkbox", { name: `Complete ${taskTitle}` }).check();
  await expect(page.getByRole("listitem").filter({ hasText: taskTitle })).toHaveCount(0, {
    timeout: 15_000,
  });
});
