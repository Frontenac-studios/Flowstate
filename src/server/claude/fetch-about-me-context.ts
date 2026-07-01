import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { aboutMeSections, userConstraints, userValues } from "@/db/tables";
import { formatConstraintSchedule, type ConstraintSchedule } from "@/lib/about-me/constraints";

const MAX_ABOUT_ME_CHARS = 4_000;

function truncate(text: string): string {
  if (text.length <= MAX_ABOUT_ME_CHARS) return text;
  return `${text.slice(0, MAX_ABOUT_ME_CHARS)}\n…(truncated)`;
}

export async function fetchAboutMeContextBlock(userId: string): Promise<string> {
  const [sectionRows, valueRows, constraintRows] = await Promise.all([
    db
      .select({ section: aboutMeSections.section, body: aboutMeSections.body })
      .from(aboutMeSections)
      .where(eq(aboutMeSections.userId, userId)),
    db
      .select({ label: userValues.label, sortOrder: userValues.sortOrder })
      .from(userValues)
      .where(eq(userValues.userId, userId))
      .orderBy(asc(userValues.sortOrder), asc(userValues.createdAt)),
    db
      .select({
        label: userConstraints.label,
        type: userConstraints.type,
        severity: userConstraints.severity,
        schedule: userConstraints.schedule,
        sortOrder: userConstraints.sortOrder,
      })
      .from(userConstraints)
      .where(eq(userConstraints.userId, userId))
      .orderBy(asc(userConstraints.sortOrder), asc(userConstraints.createdAt)),
  ]);

  const bodies = Object.fromEntries(
    sectionRows.map((row) => [row.section, row.body.trim()])
  ) as Record<string, string>;

  const valuesLine =
    valueRows.length === 0
      ? "Core values: (none yet)"
      : `Core values: ${valueRows.map((v) => v.label).join(", ")}`;

  const proseParts: string[] = [];
  for (const key of ["work", "life"] as const) {
    const body = bodies[key];
    if (body) proseParts.push(`${key.charAt(0).toUpperCase() + key.slice(1)}:\n${body}`);
  }

  const constraintLines =
    constraintRows.length === 0
      ? ["Constraints: (none yet)"]
      : [
          "Constraints:",
          ...constraintRows.map((c) => {
            const schedule = formatConstraintSchedule(c.schedule as ConstraintSchedule | null);
            const schedulePart = schedule ? ` (${schedule})` : "";
            return `- ${c.label} [${c.type}, ${c.severity}]${schedulePart}`;
          }),
        ];

  const block = ["About me:", valuesLine, ...proseParts, ...constraintLines]
    .filter(Boolean)
    .join("\n\n");

  if (block.trim() === "About me:\n\nCore values: (none yet)\n\nConstraints: (none yet)") {
    return "About me: (empty — no values, prose, or constraints yet)";
  }

  return truncate(block);
}
