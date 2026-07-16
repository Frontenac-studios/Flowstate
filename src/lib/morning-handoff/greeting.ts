export const MORNING_HANDOFF_TIMEZONE = "America/Los_Angeles";

export const DEFAULT_HANDOFF_FIRST_NAME = "Kat";

export type GreetingPeriod = "morning" | "afternoon" | "evening" | "late";

function hourInTimeZone(now: Date, timeZone: string): number {
  const hourToken = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).format(now);

  return Number(hourToken);
}

/** Morning <12, afternoon <17, evening <20, else late. */
export function resolveGreetingPeriod(
  now: Date = new Date(),
  timeZone: string = MORNING_HANDOFF_TIMEZONE
): GreetingPeriod {
  const hour = hourInTimeZone(now, timeZone);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 20) return "evening";
  return "late";
}

export function formatGreetingTitle(
  period: GreetingPeriod,
  firstName: string = DEFAULT_HANDOFF_FIRST_NAME
): string {
  switch (period) {
    case "morning":
      return `Good morning, ${firstName}`;
    case "afternoon":
      return `Good afternoon, ${firstName}`;
    case "evening":
      return `Good evening, ${firstName}`;
    case "late":
      return `It's late, ${firstName}`;
  }
}

/** First assistant bubble in the morning triage thread. */
export function formatGreetingOpener(
  period: GreetingPeriod,
  firstName: string = DEFAULT_HANDOFF_FIRST_NAME
): string {
  switch (period) {
    case "morning":
      return `Good morning, ${firstName}. Before the day picks up, let's see what's still open and what you want on your plate today.`;
    case "afternoon":
      return `Good afternoon, ${firstName}. Whenever you're ready, we can catch up on what's still open and shape the rest of your day.`;
    case "evening":
      return `Good evening, ${firstName}. Let's take a quick pass on anything left hanging and decide what still matters tonight.`;
    case "late":
      return `It's getting late, ${firstName}. If you're wrapping up, let's close the loops that are easy to finish — then give yourself space to rest and reflect on the day.`;
  }
}
