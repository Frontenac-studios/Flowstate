import { describe, expect, it } from "vitest";

import { computeDrawPanel, type DrawPanelSettings } from "./compute-draw-panel";

const noSettings: DrawPanelSettings = {
  taxReservePercentBps: null,
  costOfLivingCents: null,
  personalSavingsCents: null,
  minimumDrawCents: null,
  bankBalanceCents: null,
};

describe("computeDrawPanel", () => {
  it("derives business cash as collected − expenses − draws (not billed, not bank)", () => {
    const panel = computeDrawPanel({
      collectedRevenueCents: 1_000_00,
      billedUnpaidRevenueCents: 500_00, // must NOT count toward cash
      expensesCents: 300_00,
      drawsCents: 200_00,
      monthlyBurnCents: 0,
      settings: noSettings,
    });
    expect(panel.businessCashCents).toBe(500_00);
    expect(panel.availableToDrawCents).toBe(500_00); // no tax reserve set
    expect(panel.taxReserveCents).toBeNull();
  });

  it("holds back a tax reserve on collected revenue and nets it out of available-to-draw", () => {
    const panel = computeDrawPanel({
      collectedRevenueCents: 1_000_00,
      billedUnpaidRevenueCents: 0,
      expensesCents: 0,
      drawsCents: 0,
      monthlyBurnCents: 0,
      settings: { ...noSettings, taxReservePercentBps: 3000 }, // 30%
    });
    expect(panel.taxReserveCents).toBe(300_00);
    expect(panel.availableToDrawCents).toBe(700_00);
  });

  it("computes business runway from cash ÷ monthly burn", () => {
    const panel = computeDrawPanel({
      collectedRevenueCents: 1_200_00,
      billedUnpaidRevenueCents: 0,
      expensesCents: 0,
      drawsCents: 0,
      monthlyBurnCents: 400_00,
      settings: noSettings,
    });
    expect(panel.businessRunwayMonths).toBe(3);
  });

  it("computes personal runway from savings ÷ cost of living, and flags below-minimum draw", () => {
    const panel = computeDrawPanel({
      collectedRevenueCents: 500_00,
      billedUnpaidRevenueCents: 0,
      expensesCents: 0,
      drawsCents: 0,
      monthlyBurnCents: 0,
      settings: {
        ...noSettings,
        costOfLivingCents: 400_00,
        personalSavingsCents: 1_200_00,
        minimumDrawCents: 600_00, // available (500) < minimum (600)
      },
    });
    expect(panel.personalRunwayMonths).toBe(3);
    expect(panel.belowMinimumDraw).toBe(true);
  });

  it("surfaces bank drift as manual balance − computed cash", () => {
    const panel = computeDrawPanel({
      collectedRevenueCents: 1_000_00,
      billedUnpaidRevenueCents: 0,
      expensesCents: 400_00,
      drawsCents: 0,
      monthlyBurnCents: 0,
      settings: { ...noSettings, bankBalanceCents: 550_00 }, // computed cash = 600; drift = -50
    });
    expect(panel.businessCashCents).toBe(600_00);
    expect(panel.bankDriftCents).toBe(-50_00);
  });

  it("goes negative honestly when draws exceed cash", () => {
    const panel = computeDrawPanel({
      collectedRevenueCents: 100_00,
      billedUnpaidRevenueCents: 0,
      expensesCents: 50_00,
      drawsCents: 200_00,
      monthlyBurnCents: 0,
      settings: noSettings,
    });
    expect(panel.businessCashCents).toBe(-150_00);
    expect(panel.availableToDrawCents).toBe(-150_00);
  });
});
