import { describe, expect, it } from "vitest";

import { bucketComingUp, type ComingUpItem } from "./bucket-coming-up";

function item(over: Partial<ComingUpItem> & Pick<ComingUpItem, "id" | "date">): ComingUpItem {
  return {
    title: `d ${over.id}`,
    kind: "task",
    category: "business",
    clientName: null,
    projectName: "Proj",
    ...over,
  };
}

// This ISO week: Mon 2026-08-31 … Sun 2026-09-06; next week ends Sun 2026-09-13.
const WINDOW = {
  todayIso: "2026-09-01",
  thisWeekEndIso: "2026-09-06",
  horizonEndIso: "2026-09-13",
};

describe("bucketComingUp", () => {
  it("splits into this-week and next-week by the Sunday divider", () => {
    const { thisWeek, nextWeek } = bucketComingUp({
      ...WINDOW,
      items: [
        item({ id: "a", date: "2026-09-01" }),
        item({ id: "b", date: "2026-09-06" }),
        item({ id: "c", date: "2026-09-07" }),
        item({ id: "d", date: "2026-09-13" }),
      ],
    });
    expect(thisWeek.map((i) => i.id)).toEqual(["a", "b"]);
    expect(nextWeek.map((i) => i.id)).toEqual(["c", "d"]);
  });

  it("excludes overdue (before today) — that belongs on Today", () => {
    const { thisWeek, nextWeek } = bucketComingUp({
      ...WINDOW,
      items: [item({ id: "past", date: "2026-08-30" }), item({ id: "now", date: "2026-09-02" })],
    });
    expect(thisWeek.map((i) => i.id)).toEqual(["now"]);
    expect(nextWeek).toEqual([]);
  });

  it("excludes anything beyond the fortnight horizon", () => {
    const { thisWeek, nextWeek } = bucketComingUp({
      ...WINDOW,
      items: [item({ id: "far", date: "2026-09-14" })],
    });
    expect(thisWeek).toEqual([]);
    expect(nextWeek).toEqual([]);
  });

  it("sorts each bucket by date then title", () => {
    const { thisWeek } = bucketComingUp({
      ...WINDOW,
      items: [
        item({ id: "late", date: "2026-09-05", title: "b" }),
        item({ id: "early", date: "2026-09-02", title: "z" }),
        item({ id: "same", date: "2026-09-05", title: "a" }),
      ],
    });
    expect(thisWeek.map((i) => i.id)).toEqual(["early", "same", "late"]);
  });
});
