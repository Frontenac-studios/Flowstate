"use client";

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import type { AppRouter } from "@/trpc/routers/_app";

type BingoRewardParams = {
  cardYear: number;
  lineType: "row" | "column" | "diagonal";
};

let bingoRewardClient: ReturnType<typeof createTRPCClient<AppRouter>> | undefined;

function getBingoRewardClient() {
  if (!bingoRewardClient) {
    bingoRewardClient = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: "/api/trpc",
        }),
      ],
    });
  }
  return bingoRewardClient;
}

/** Bingo line reward — persists garden nourishment via Care (RW-2). */
export async function recordBingoReward(params: BingoRewardParams): Promise<void> {
  await getBingoRewardClient().care.recordBingoNourish.mutate(params);
}
