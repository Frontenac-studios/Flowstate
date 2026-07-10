import { describe, expect, it } from "vitest";

import { eventToDayMinutes } from "./event-to-day-minutes";

describe("eventToDayMinutes", () => {
  const pst = -480;

  it("maps a timed event fully inside the local day", () => {
    const geometry = eventToDayMinutes(
      {
        startAt: new Date("2026-05-26T17:00:00.000Z"),
        endAt: new Date("2026-05-27T01:00:00.000Z"),
        isAllDay: false,
      },
      "2026-05-26",
      pst
    );

    expect(geometry).toEqual({ startMin: 9 * 60, endMin: 17 * 60 });
  });

  it("clips a multi-day timed event to the local day bounds", () => {
    const geometry = eventToDayMinutes(
      {
        startAt: new Date("2026-05-25T20:00:00.000Z"),
        endAt: new Date("2026-05-27T04:00:00.000Z"),
        isAllDay: false,
      },
      "2026-05-26",
      pst
    );

    expect(geometry).toEqual({ startMin: 0, endMin: 20 * 60 });
  });

  it("returns null when a timed event does not overlap the day", () => {
    const geometry = eventToDayMinutes(
      {
        startAt: new Date("2026-05-27T17:00:00.000Z"),
        endAt: new Date("2026-05-28T01:00:00.000Z"),
        isAllDay: false,
      },
      "2026-05-26",
      pst
    );

    expect(geometry).toBeNull();
  });

  it("maps a single-day all-day event by calendar date, not wall-clock UTC", () => {
    const geometry = eventToDayMinutes(
      {
        startAt: new Date("2026-05-26T00:00:00.000Z"),
        endAt: new Date("2026-05-27T00:00:00.000Z"),
        isAllDay: true,
      },
      "2026-05-26",
      pst
    );

    expect(geometry).toEqual({ startMin: 0, endMin: 1440 });
  });

  it("avoids western TZ off-by-one for all-day events stored at UTC midnight", () => {
    const geometry = eventToDayMinutes(
      {
        startAt: new Date("2026-05-26T00:00:00.000Z"),
        endAt: new Date("2026-05-27T00:00:00.000Z"),
        isAllDay: true,
      },
      "2026-05-25",
      pst
    );

    expect(geometry).toBeNull();
  });

  it("maps each day of a multi-day all-day event", () => {
    const event = {
      startAt: new Date("2026-05-26T00:00:00.000Z"),
      endAt: new Date("2026-05-28T00:00:00.000Z"),
      isAllDay: true,
    };

    expect(eventToDayMinutes(event, "2026-05-26", pst)).toEqual({ startMin: 0, endMin: 1440 });
    expect(eventToDayMinutes(event, "2026-05-27", pst)).toEqual({ startMin: 0, endMin: 1440 });
    expect(eventToDayMinutes(event, "2026-05-28", pst)).toBeNull();
  });

  it("clips timed events that start before local midnight", () => {
    const geometry = eventToDayMinutes(
      {
        startAt: new Date("2026-05-26T07:00:00.000Z"),
        endAt: new Date("2026-05-26T09:00:00.000Z"),
        isAllDay: false,
      },
      "2026-05-26",
      pst
    );

    expect(geometry).toEqual({ startMin: 0, endMin: 60 });
  });
});
