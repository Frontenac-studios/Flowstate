import type { AboutMeSection } from "@/lib/about-me/constants";
import type { AboutMeEditProposal } from "@/lib/about-me/propose";

type RawToolProposal = {
  targetSection?: string;
  sourceText?: string;
  learnedAt?: string;
  text?: string;
  label?: string;
  type?: string;
  severity?: string;
  schedule?: unknown;
  payload?: unknown;
};

export function normalizeChatToolProposal(raw: RawToolProposal): AboutMeEditProposal | null {
  const targetSection = raw.targetSection as AboutMeSection | undefined;
  const sourceText = raw.sourceText?.trim();
  if (!targetSection || !sourceText) return null;

  let payload: unknown = raw.payload;
  if (payload == null) {
    if (targetSection === "values" || targetSection === "constraints") {
      if (!raw.label?.trim()) return null;
      if (targetSection === "values") {
        payload = { label: raw.label.trim() };
      } else {
        if (!raw.type || !raw.severity) return null;
        payload = {
          type: raw.type,
          label: raw.label.trim(),
          schedule: raw.schedule ?? null,
          severity: raw.severity,
        };
      }
    } else if (targetSection === "work" || targetSection === "life") {
      if (!raw.text?.trim()) return null;
      payload = { text: raw.text.trim() };
    } else {
      return null;
    }
  }

  const learnedAt = raw.learnedAt ? new Date(raw.learnedAt) : undefined;
  if (learnedAt && Number.isNaN(learnedAt.getTime())) return null;

  return { targetSection, payload, sourceText, learnedAt };
}
