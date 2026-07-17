import type { calendar_v3 } from "googleapis";
import { describe, expect, it } from "vitest";

import { normalizeGoogleEvent } from "./normalize-google-event";

const CALENDAR_ID = "primary";

function baseTimedEvent(
  overrides: Partial<calendar_v3.Schema$Event> = {}
): calendar_v3.Schema$Event {
  return {
    id: "evt-1",
    status: "confirmed",
    summary: "Standup",
    start: { dateTime: "2026-05-26T17:00:00.000Z" },
    end: { dateTime: "2026-05-26T17:30:00.000Z" },
    ...overrides,
  };
}

describe("normalizeGoogleEvent", () => {
  it("maps all-day events using UTC midnight calendar dates", () => {
    const result = normalizeGoogleEvent(
      {
        id: "allday-1",
        status: "confirmed",
        summary: "Holiday",
        start: { date: "2026-05-26" },
        end: { date: "2026-05-27" },
      },
      CALENDAR_ID,
      "Personal"
    );

    expect(result).toMatchObject({
      action: "upsert",
      row: {
        providerEventId: "allday-1",
        isAllDay: true,
        startAt: new Date("2026-05-26T00:00:00.000Z"),
        endAt: new Date("2026-05-27T00:00:00.000Z"),
      },
    });
  });

  it("deletes cancelled events", () => {
    const result = normalizeGoogleEvent(baseTimedEvent({ status: "cancelled" }), CALENDAR_ID);

    expect(result).toEqual({ action: "delete", providerEventId: "evt-1" });
  });

  it("deletes events where the user declined", () => {
    const result = normalizeGoogleEvent(
      baseTimedEvent({
        attendees: [{ self: true, responseStatus: "declined" }],
      }),
      CALENDAR_ID
    );

    expect(result).toEqual({ action: "delete", providerEventId: "evt-1" });
  });

  it("upserts tentative events with tentative status", () => {
    const result = normalizeGoogleEvent(baseTimedEvent({ status: "tentative" }), CALENDAR_ID);

    expect(result).toMatchObject({
      action: "upsert",
      row: {
        providerEventId: "evt-1",
        status: "tentative",
        isAllDay: false,
      },
    });
  });

  it("skips events without an id", () => {
    expect(normalizeGoogleEvent({ status: "confirmed" }, CALENDAR_ID)).toEqual({
      action: "skip",
    });
  });

  it("skips events with unparseable times", () => {
    expect(
      normalizeGoogleEvent({ id: "evt-2", status: "confirmed", start: {}, end: {} }, CALENDAR_ID)
    ).toEqual({ action: "skip" });
  });

  it("stores calendar color from the calendar list", () => {
    const result = normalizeGoogleEvent(baseTimedEvent(), CALENDAR_ID, "Work", "#039be5");

    expect(result).toMatchObject({
      action: "upsert",
      row: {
        calendarName: "Work",
        calendarColor: "#039be5",
      },
    });
  });
});
