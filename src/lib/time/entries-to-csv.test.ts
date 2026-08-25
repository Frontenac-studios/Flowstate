import { describe, expect, it } from "vitest";

import { entriesToCsv, type ExportRow } from "./entries-to-csv";

const row: ExportRow = {
  startedAt: new Date(2026, 7, 24, 9, 0), // local 09:00
  endedAt: new Date(2026, 7, 24, 10, 30), // local 10:30
  clientName: "Great White",
  projectName: "Launch",
  taskTitle: "API work",
  tagName: "Development",
  description: "endpoints",
  billable: true,
  invoicedAt: null,
};

describe("entriesToCsv", () => {
  it("writes a header and one row with a decimal-hour duration", () => {
    const csv = entriesToCsv([row]);
    const [header, first] = csv.split("\n");
    expect(header).toBe(
      "Date,Start,End,Client,Project,Task,Tag,Description,Hours,Billable,Invoiced"
    );
    expect(first).toBe(
      "2026-08-24,09:00,10:30,Great White,Launch,API work,Development,endpoints,1.50,yes,"
    );
  });

  it("blanks the duration for a running entry and leaves optional fields empty", () => {
    const csv = entriesToCsv([
      {
        ...row,
        endedAt: null,
        clientName: null,
        taskTitle: null,
        tagName: null,
        description: null,
        billable: false,
      },
    ]);
    const first = csv.split("\n")[1]!;
    expect(first).toBe("2026-08-24,09:00,,,Launch,,,,,no,");
  });

  it("escapes commas, quotes, and newlines per RFC 4180", () => {
    const csv = entriesToCsv([{ ...row, description: 'fixed "bug", again\nline2' }]);
    expect(csv.split("\n").slice(1).join("\n")).toContain('"fixed ""bug"", again');
  });
});
