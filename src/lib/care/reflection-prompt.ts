export type ReflectionPromptFrame = { win: string; drain: string; forward: string };

export function templateReflectionPrompt(todayIso: string): ReflectionPromptFrame {
  void todayIso;
  return {
    win: "What's one small thing that went well today?",
    drain: "What felt heavy or draining?",
    forward: "What's one gentle note for tomorrow?",
  };
}

export function formatReflectionPrompt(frame: ReflectionPromptFrame): string {
  return `${frame.win}\n\n${frame.drain}\n\n${frame.forward}`;
}

export const MOOD_OPTIONS = [
  { value: 1, label: "Heavy", emoji: "🌧" },
  { value: 2, label: "Low", emoji: "🌥" },
  { value: 3, label: "Okay", emoji: "🌤" },
  { value: 4, label: "Good", emoji: "☀️" },
  { value: 5, label: "Bright", emoji: "🌞" },
] as const;
