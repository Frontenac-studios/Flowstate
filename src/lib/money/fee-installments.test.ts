import { describe, expect, it } from "vitest";

import {
  installmentStatus,
  isInstallmentBillable,
  isInstallmentReady,
  type InstallmentFacts,
} from "./fee-installments";

const base: InstallmentFacts = { readyAt: null, milestoneCompletedAt: null, invoiceId: null };
const d = new Date("2026-09-30T12:00:00Z");

describe("fee installment readiness", () => {
  it("is scheduled until its milestone completes or it is marked ready", () => {
    expect(isInstallmentReady(base)).toBe(false);
    expect(installmentStatus(base)).toBe("scheduled");
  });

  it("becomes billable when the linked milestone completes", () => {
    const i = { ...base, milestoneCompletedAt: d };
    expect(isInstallmentBillable(i)).toBe(true);
    expect(installmentStatus(i)).toBe("ready");
  });

  it("becomes billable when marked ready by hand", () => {
    expect(isInstallmentBillable({ ...base, readyAt: d })).toBe(true);
  });

  it("is no longer billable once invoiced, and reads paid when its invoice is", () => {
    const invoiced = { ...base, readyAt: d, invoiceId: "inv" };
    expect(isInstallmentBillable(invoiced)).toBe(false);
    expect(installmentStatus(invoiced)).toBe("invoiced");
    expect(installmentStatus({ ...invoiced, invoicePaidAt: d })).toBe("paid");
  });
});
