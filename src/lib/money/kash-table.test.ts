import { describe, expect, it } from "vitest";

import { allocateCents, buildKashTable } from "./kash-table";

const now = new Date("2026-09-30T12:00:00");
const H = 3600;

const base = {
  clients: [{ id: "gw", name: "Great White", rateCents: 4500, archived: false }],
  projects: [
    {
      id: "home",
      name: "Homepage redesign",
      clientId: "gw",
      hue: 1,
      billingType: "hourly" as const,
      archived: false,
    },
    {
      id: "brand",
      name: "Brand system",
      clientId: "gw",
      hue: 2,
      billingType: "fixed_fee" as const,
      archived: false,
    },
    {
      id: "ret",
      name: "Retainer",
      clientId: "gw",
      hue: 3,
      billingType: "fixed_fee" as const,
      archived: false,
    },
  ],
  fees: [
    { projectId: "brand", feeAmountCents: 1_400_000, proposalAmountCents: null },
    { projectId: "ret", feeAmountCents: 1_000_000, proposalAmountCents: null },
  ],
  entries: [
    { projectId: "home", seconds: 20 * H, billable: true, invoiceId: null },
    { projectId: "home", seconds: 10 * H, billable: true, invoiceId: "t1" },
    { projectId: "home", seconds: 2 * H, billable: false, invoiceId: null },
  ],
  invoices: [
    {
      id: "t1",
      clientId: "gw",
      kind: "time" as const,
      amountCents: 45_000,
      status: "accepted" as const,
      paidAt: now,
    },
    {
      id: "f1",
      clientId: "gw",
      kind: "fee" as const,
      amountCents: 150_000,
      status: "accepted" as const,
      paidAt: null,
    },
    {
      id: "v1",
      clientId: "gw",
      kind: "time" as const,
      amountCents: 99_999,
      status: "void" as const,
      paidAt: null,
    },
  ],
  installments: [
    {
      projectId: "brand",
      label: "Milestone 3",
      amountCents: 200_000,
      invoiceId: null,
      ready: true,
    },
    {
      projectId: "brand",
      label: "Milestone 4",
      amountCents: 300_000,
      invoiceId: null,
      ready: false,
    },
    { projectId: "brand", label: "Deposit", amountCents: 150_000, invoiceId: "f1", ready: true },
  ],
  now,
};

describe("buildKashTable", () => {
  const table = buildKashTable(base);
  const gw = table.clients[0]!;
  const row = (id: string) => gw.projects.find((p) => p.id === id)!;

  it("bills hourly time at the client rate and fixed fees by ready installments", () => {
    expect(row("home").billableSeconds).toBe(20 * H);
    expect(row("home").billableCents).toBe(90_000);
    expect(row("brand").billableCents).toBe(200_000);
    expect(row("brand").note).toBe("lump sum · Milestone 3");
    expect(gw.billableCents).toBe(290_000);
  });

  it("derives per-project AR and paid from the invoices, ignoring void", () => {
    expect(row("home").paidCents).toBe(45_000);
    expect(row("brand").arCents).toBe(150_000);
    expect(gw.arCents).toBe(150_000);
    expect(gw.paidCents).toBe(45_000);
  });

  it("marks an untouched project as not started and shows its contract", () => {
    expect(row("ret").note).toBe("not started");
    expect(row("ret").contractCents).toBe(1_000_000);
    expect(row("home").contractCents).toBeNull();
    expect(gw.contractCents).toBe(2_400_000);
  });

  it("totals the header figures", () => {
    expect(table.totals).toEqual({
      billableCents: 290_000,
      billableSeconds: 20 * H,
      billableInstallments: 1,
      arCents: 150_000,
      unpaidInvoices: 1,
      paidThisYearCents: 45_000,
    });
  });

  it("takes the client dot from its first project's hue", () => {
    expect(gw.hue).toBe(1);
  });

  it("drops an archived project that carries no money", () => {
    const t = buildKashTable({
      ...base,
      projects: base.projects.map((p) => (p.id === "ret" ? { ...p, archived: true } : p)),
    });
    expect(t.clients[0]!.projects.map((p) => p.id)).toEqual(["home", "brand"]);
  });
});

describe("allocateCents", () => {
  it("splits by weight and always sums to the total", () => {
    const parts = allocateCents(
      100,
      new Map([
        ["a", 1],
        ["b", 1],
        ["c", 1],
      ])
    );
    expect(Array.from(parts.values()).reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts.get("a")).toBe(34);
  });

  it("allocates nothing when there is no weight", () => {
    expect(allocateCents(100, new Map()).size).toBe(0);
  });
});
