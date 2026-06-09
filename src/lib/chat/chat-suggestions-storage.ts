import { CHAT_SUGGESTION_DEFS, type ChatSuggestionDef } from "./chat-suggestion-defs";

const STORAGE_KEY = "kash.chat.suggestionUsage";

type UsageSnapshot = {
  usageCounts: Record<string, number>;
};

function readStorage(): UsageSnapshot {
  if (typeof window === "undefined") {
    return { usageCounts: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { usageCounts: {} };
    const parsed = JSON.parse(raw) as UsageSnapshot;
    if (!parsed || typeof parsed.usageCounts !== "object") {
      return { usageCounts: {} };
    }
    return parsed;
  } catch {
    return { usageCounts: {} };
  }
}

function writeStorage(snapshot: UsageSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota / private mode
  }
}

export function readBuiltinUsageCounts(): Record<string, number> {
  return readStorage().usageCounts;
}

export function getSortedSuggestions(): ChatSuggestionDef[] {
  const { usageCounts } = readStorage();
  return mergeAndSortSuggestions(CHAT_SUGGESTION_DEFS, [], usageCounts);
}

export function mergeAndSortSuggestions(
  builtins: ChatSuggestionDef[],
  custom: ChatSuggestionDef[],
  builtinUsageCounts: Record<string, number>,
  customUsageCounts?: Record<string, number>
): ChatSuggestionDef[] {
  const usageById = new Map<string, number>();
  for (const def of builtins) {
    usageById.set(def.id, builtinUsageCounts[def.id] ?? 0);
  }
  for (const def of custom) {
    usageById.set(def.id, customUsageCounts?.[def.id] ?? 0);
  }

  const builtinOrder = new Map(builtins.map((def, index) => [def.id, index]));
  const customOrder = new Map(custom.map((def, index) => [def.id, index]));

  return [...builtins, ...custom].sort((a, b) => {
    const aCount = usageById.get(a.id) ?? 0;
    const bCount = usageById.get(b.id) ?? 0;
    if (bCount !== aCount) return bCount - aCount;

    const aBuiltin = builtinOrder.get(a.id);
    const bBuiltin = builtinOrder.get(b.id);
    if (aBuiltin !== undefined && bBuiltin !== undefined) return aBuiltin - bBuiltin;
    if (aBuiltin !== undefined) return -1;
    if (bBuiltin !== undefined) return 1;

    const aCustom = customOrder.get(a.id) ?? 0;
    const bCustom = customOrder.get(b.id) ?? 0;
    return bCustom - aCustom;
  });
}

export function recordSuggestionUsage(id: string): void {
  const snapshot = readStorage();
  snapshot.usageCounts[id] = (snapshot.usageCounts[id] ?? 0) + 1;
  writeStorage(snapshot);
}

/** Test helper */
export function resetSuggestionUsageForTests(): void {
  writeStorage({ usageCounts: {} });
}
