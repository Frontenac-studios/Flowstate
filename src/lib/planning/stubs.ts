/** Cross-feature stubs until Abyss / Care / Values / AI persona ship (§12.3). */

export type AbyssBalanceCandidate = {
  id: string;
  title: string;
  category: string;
};

/** Balance pass resurface tray — empty until §10 Abyss. */
export async function fetchAbyssBalanceCandidates(): Promise<AbyssBalanceCandidate[]> {
  return [];
}

/** Bingo line reward — no-op until §12 Care garden. */
export async function recordBingoReward(params: {
  cardYear: number;
  lineType: "row" | "column" | "diagonal";
}): Promise<void> {
  void params;
  /* Care integration PR */
}
