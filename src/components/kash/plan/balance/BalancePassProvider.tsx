"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { balancePassScopeKey, type BalancePassScope } from "@/lib/planning/balance-pass";
import { useTRPC } from "@/trpc/client";

import BalancePassChip from "./BalancePassChip";

type BalancePassContextValue = {
  triggerBalancePass: (scope: BalancePassScope) => void;
};

const BalancePassContext = createContext<BalancePassContextValue | null>(null);

export function useBalancePassTrigger(): ((scope: BalancePassScope) => void) | undefined {
  return useContext(BalancePassContext)?.triggerBalancePass;
}

type Props = {
  children: ReactNode;
};

export default function BalancePassProvider({ children }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeScope, setActiveScope] = useState<BalancePassScope | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [chipDismissed, setChipDismissed] = useState(false);
  const inflightRef = useRef(false);

  const scopeKey = useMemo(
    () => (activeScope ? balancePassScopeKey(activeScope) : null),
    [activeScope]
  );

  const suggestionsQuery = useQuery(
    trpc.planning.listSuggestions.queryOptions({
      surface: "balance_pass",
      status: "pending",
    })
  );

  const suggestMutation = useMutation(
    trpc.planning.suggestBalancePass.mutationOptions({
      onSuccess: (rows) => {
        inflightRef.current = false;
        void queryClient.invalidateQueries({ queryKey: trpc.planning.listSuggestions.queryKey() });
        if (rows.length > 0) {
          setChipDismissed(false);
          setExpanded(true);
        }
      },
      onError: () => {
        inflightRef.current = false;
      },
    })
  );

  const scopedCount = useMemo(() => {
    if (!scopeKey) return 0;
    return (suggestionsQuery.data ?? []).filter((s) => {
      const payload = s.payload as { scopeKey?: string };
      return payload.scopeKey === scopeKey;
    }).length;
  }, [suggestionsQuery.data, scopeKey]);

  useEffect(() => {
    if (activeScope || !suggestionsQuery.data?.length) return;
    const pending = suggestionsQuery.data.filter((s) => {
      const payload = s.payload as { scopeKey?: string; horizon?: "week" | "month" };
      return payload.scopeKey && payload.horizon;
    });
    const latest = pending.at(-1);
    if (!latest) return;
    const payload = latest.payload as {
      horizon: "week" | "month";
      year: number;
      month?: number | null;
      quarter?: number | null;
      weekStart?: string | null;
    };
    setActiveScope({
      horizon: payload.horizon,
      year: payload.year,
      month: payload.month ?? undefined,
      quarter: payload.quarter ?? undefined,
      weekStart: payload.weekStart ?? undefined,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    });
  }, [activeScope, suggestionsQuery.data]);

  const triggerBalancePass = useCallback(
    (scope: BalancePassScope) => {
      if (inflightRef.current) return;
      inflightRef.current = true;
      setActiveScope(scope);
      suggestMutation.mutate({
        horizon: scope.horizon,
        year: scope.year,
        month: scope.month,
        quarter: scope.quarter,
        weekStart: scope.weekStart,
        tzOffsetMinutes: scope.tzOffsetMinutes,
      });
    },
    [suggestMutation]
  );

  const showChip = scopedCount > 0 && !chipDismissed;

  return (
    <BalancePassContext.Provider value={{ triggerBalancePass }}>
      {children}
      {showChip && scopeKey ? (
        <BalancePassChip
          scopeKey={scopeKey}
          count={scopedCount}
          expanded={expanded}
          onToggle={() => setExpanded((prev) => !prev)}
          onDismiss={() => {
            setChipDismissed(true);
            setExpanded(false);
          }}
        />
      ) : null}
    </BalancePassContext.Provider>
  );
}
