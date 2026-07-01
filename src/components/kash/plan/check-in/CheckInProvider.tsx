"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  isCheckInCadenceDue,
  readCheckInStorage,
  type CheckInStorageSnapshot,
} from "@/lib/planning/check-in-storage";
import type { PlanningBreadcrumb } from "@/lib/planning/horizon-storage";
import { resolveWeekAnchorDate } from "@/lib/planning/week-breadcrumb";

import CheckInModal from "./CheckInModal";

type CheckInContextValue = {
  openCheckIn: () => void;
  showNudge: boolean;
  modalOpen: boolean;
};

const CheckInContext = createContext<CheckInContextValue | null>(null);

export function useCheckIn(): CheckInContextValue {
  const ctx = useContext(CheckInContext);
  if (!ctx) {
    throw new Error("useCheckIn must be used within CheckInProvider");
  }
  return ctx;
}

type Props = {
  breadcrumb: PlanningBreadcrumb;
  children: ReactNode;
};

export default function CheckInProvider({ breadcrumb, children }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [storageTick, setStorageTick] = useState(0);
  const [showNudge, setShowNudge] = useState(false);

  void storageTick;
  const storage: CheckInStorageSnapshot = readCheckInStorage();

  const weekStart = useMemo(() => {
    try {
      return resolveWeekAnchorDate(breadcrumb);
    } catch {
      return undefined;
    }
  }, [breadcrumb]);

  useEffect(() => {
    setShowNudge(
      isCheckInCadenceDue(new Date(), {
        cadence: storage.cadence,
        snoozeUntil: storage.snoozeUntil,
        lastCompletedAt: storage.lastCompletedAt,
      })
    );
  }, [storage.cadence, storage.snoozeUntil, storage.lastCompletedAt, storageTick, modalOpen]);

  const openCheckIn = useCallback(() => {
    setModalOpen(true);
    setShowNudge(false);
  }, []);

  const refreshStorage = useCallback(() => {
    setStorageTick((n) => n + 1);
  }, []);

  return (
    <CheckInContext.Provider value={{ openCheckIn, showNudge, modalOpen }}>
      {children}
      <CheckInModal
        open={modalOpen}
        year={breadcrumb.year}
        month={breadcrumb.month}
        quarter={breadcrumb.quarter}
        weekStart={weekStart}
        onClose={() => setModalOpen(false)}
        onCompleted={refreshStorage}
      />
    </CheckInContext.Provider>
  );
}

/** Entry affordance for /plan header (PM7-1). */
export function CheckInEntry() {
  const { openCheckIn, showNudge, modalOpen } = useCheckIn();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showNudge && !modalOpen ? (
        <button
          type="button"
          onClick={openCheckIn}
          className="border-ink/20 rounded-pill border bg-surface-2 px-3 py-1 text-caption font-medium text-ink transition duration-short hover:bg-surface"
        >
          Gentle check-in due
        </button>
      ) : null}
      <button
        type="button"
        onClick={openCheckIn}
        className="rounded-control border border-subtle px-3 py-1.5 text-caption font-medium text-ink transition duration-short hover:border-ink-muted hover:bg-surface-2"
      >
        Check-in
      </button>
    </div>
  );
}
