"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ghostColumnCount as computeGhostColumnCount,
  MILLER_COLUMN_WIDTH_CLASS,
  MIN_VISIBLE_COLUMNS,
  visibleColumnTarget,
} from "./miller-columns";

export function useMillerStripLayout(realColumnCount: number) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [targetVisibleColumns, setTargetVisibleColumns] = useState(MIN_VISIBLE_COLUMNS);

  const updateTarget = useCallback(() => {
    const stripWidth = stripRef.current?.clientWidth ?? 0;
    setTargetVisibleColumns(visibleColumnTarget(stripWidth, window.innerWidth));
  }, []);

  useEffect(() => {
    updateTarget();

    const el = stripRef.current;
    let stripObs: ResizeObserver | undefined;
    if (el && typeof ResizeObserver !== "undefined") {
      stripObs = new ResizeObserver(updateTarget);
      stripObs.observe(el);
    }

    window.addEventListener("resize", updateTarget);
    return () => {
      stripObs?.disconnect();
      window.removeEventListener("resize", updateTarget);
    };
  }, [updateTarget]);

  const ghostColumnCount = computeGhostColumnCount(realColumnCount, targetVisibleColumns);

  return {
    stripRef,
    ghostColumnCount,
    widthClassName: MILLER_COLUMN_WIDTH_CLASS,
    targetVisibleColumns,
  };
}
