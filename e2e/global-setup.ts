import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const AUTH_DIR = path.join(__dirname, ".auth");
const AUTH_FILE = path.join(AUTH_DIR, "user.json");

async function cleanupE2eUserData(dbUrl: string, userId: string) {
  const sql = postgres(dbUrl, { prepare: false, max: 1 });
  try {
    await sql`DELETE FROM task_time_entries WHERE user_id = ${userId}`;
    await sql`DELETE FROM chat_messages WHERE user_id = ${userId}`;
    await sql`DELETE FROM nudge_events WHERE user_id = ${userId}`;
    await sql`DELETE FROM day_reviews WHERE user_id = ${userId}`;
    await sql`DELETE FROM tasks WHERE user_id = ${userId}`;
    await sql`DELETE FROM projects WHERE user_id = ${userId}`;
  } finally {
    await sql.end();
  }
}

async function ensureE2eUser(
  supabaseUrl: string,
  serviceKey: string,
  email: string,
  password: string
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    "Content-Type": "application/json",
  };

  const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, { headers });
  if (!listRes.ok) {
    throw new Error(`Failed to list users: ${listRes.status} ${await listRes.text()}`);
  }

  const listBody = (await listRes.json()) as { users: { id: string; email?: string }[] };
  const existing = listBody.users.find((u) => u.email === email);

  if (existing) {
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ password, email_confirm: true }),
    });
    if (!updateRes.ok) {
      throw new Error(`Failed to update E2E user: ${updateRes.status} ${await updateRes.text()}`);
    }
    return existing.id;
  }

  const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!createRes.ok) {
    throw new Error(`Failed to create E2E user: ${createRes.status} ${await createRes.text()}`);
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    (config.projects[0]?.use?.baseURL as string | undefined) ?? "http://127.0.0.1:3000";
  const email = process.env.E2E_USER_EMAIL ?? "e2e@kash.test";
  const password = process.env.E2E_USER_PASSWORD ?? "e2e-test-password-12!";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "E2E requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (run supabase start first)."
    );
  }

  const userId = await ensureE2eUser(supabaseUrl, serviceKey, email, password);

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    await cleanupE2eUserData(dbUrl, userId);
  }

  const e2eEnvPath = path.join(__dirname, "..", ".env.e2e");
  const e2eEnvLines = [
    `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
    `DATABASE_URL=${process.env.DATABASE_URL ?? ""}`,
    `ANTHROPIC_API_KEY=`,
  ];
  fs.writeFileSync(e2eEnvPath, `${e2eEnvLines.join("\n")}\n`);

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await page.waitForURL("**/plan**", { timeout: 60_000 });
  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}
