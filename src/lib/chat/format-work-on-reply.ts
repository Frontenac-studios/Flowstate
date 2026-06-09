const TOP3_SLOT_LABELS = ["①", "②", "③"] as const;

export type WorkOnReplyPick = {
  title: string;
  pickReason: string;
};

export type StalledTop3ForReply = {
  title: string;
  top3Order: number;
};

export function formatWorkOnReply(params: {
  pick: WorkOnReplyPick | null;
  stalledTop3: StalledTop3ForReply[];
  localHour: number;
  nudgeThresholdHour: number;
}): string {
  const { pick, stalledTop3, localHour, nudgeThresholdHour } = params;

  if (!pick) {
    return "Nothing on deck for today yet. Capture something on your plan, or tell me what you're working toward.";
  }

  const lines = [`Try **${pick.title}** — ${pick.pickReason}.`];

  if (localHour >= nudgeThresholdHour && stalledTop3.length > 0) {
    const slotList = stalledTop3
      .sort((a, b) => a.top3Order - b.top3Order)
      .map((t) => {
        const label = TOP3_SLOT_LABELS[t.top3Order - 1] ?? `${t.top3Order}`;
        return `${label} **${t.title}**`;
      })
      .join(", ");

    lines.push(`You still have ${slotList} on your Top 3 — worth a look if you have time.`);
  }

  return lines.join("\n\n");
}
