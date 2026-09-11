import { APICallError } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { draftInvoiceLineItems, type LineToDraft } from "./draft-line-items";

const generateText = vi.fn();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: (...args: unknown[]) => generateText(...args) };
});

const modelConfigured = vi.fn(() => true);
vi.mock("@/lib/env", () => ({
  isModelConfigured: () => modelConfigured(),
  resolveModel: () => "test/model",
}));

vi.mock("../claude/client", () => ({ requireModel: () => ({}) }));

// A client's work description. It must reach the model and must never reach a log.
const SECRET = "reconciled the confidential POS export for the Tampa location";

const lines: LineToDraft[] = [
  { index: 0, seedLabel: "prime cost work", rawLabels: [SECRET], hours: 6.5, isAdditional: false },
  {
    index: 1,
    seedLabel: "labor mapping",
    rawLabels: ["mapped FOH job codes"],
    hours: 3,
    isAdditional: false,
  },
];

const FALLBACK = [
  { index: 0, label: "Prime cost work", description: "" },
  { index: 1, label: "Labor mapping", description: "" },
];

/** Every argument passed to a console spy, flattened to one searchable string. */
function logged(spy: { mock: { calls: unknown[][] } }): string {
  return JSON.stringify(spy.mock.calls);
}

describe("draftInvoiceLineItems", () => {
  let error: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    generateText.mockReset();
    modelConfigured.mockReturnValue(true);
    error = vi.spyOn(console, "error").mockImplementation(() => {});
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    error.mockRestore();
    warn.mockRestore();
  });

  it("returns the model's wording when the reply parses", async () => {
    generateText.mockResolvedValue({
      text: '```json\n[{"index":0,"label":"Prime Cost Rebuild","description":"Rebuilt it."},{"index":1,"label":"FOH Mapping","description":"Mapped it."}]\n```',
    });

    const drafted = await draftInvoiceLineItems({ clientName: "Great White", lines });

    expect(drafted[0]).toEqual({
      index: 0,
      label: "Prime Cost Rebuild",
      description: "Rebuilt it.",
    });
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back and logs when the model call throws", async () => {
    generateText.mockRejectedValue(
      new APICallError({
        message: "Rate limit exceeded",
        url: "https://openrouter.ai/api/v1/chat/completions",
        requestBodyValues: { messages: [{ role: "user", content: SECRET }] },
        statusCode: 429,
        isRetryable: true,
      })
    );

    const drafted = await draftInvoiceLineItems({ clientName: "Great White", lines });

    expect(drafted).toEqual(FALLBACK);
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0]?.[1]).toMatchObject({
      model: "test/model",
      lines: 2,
      status: 429,
      cause: "Rate limit exceeded",
    });
  });

  it("never logs the client's work, even though the error carries the whole request", async () => {
    generateText.mockRejectedValue(
      new APICallError({
        message: "Bad request",
        url: "https://openrouter.ai/api/v1/chat/completions",
        requestBodyValues: { messages: [{ role: "user", content: SECRET }] },
        statusCode: 400,
      })
    );

    await draftInvoiceLineItems({ clientName: "Great White", lines });

    expect(logged(error)).not.toContain("confidential POS export");
  });

  it("falls back and warns when the reply is unusable, without logging the reply", async () => {
    generateText.mockResolvedValue({ text: `I can't format this, but: ${SECRET}` });

    const drafted = await draftInvoiceLineItems({ clientName: "Great White", lines });

    expect(drafted).toEqual(FALLBACK);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[1]).toMatchObject({ model: "test/model", lines: 2 });
    expect(logged(warn)).not.toContain("confidential POS export");
  });

  it("distrusts the whole set when any line comes back without a label", async () => {
    generateText.mockResolvedValue({ text: '[{"index":0,"label":"Only one","description":"x"}]' });

    expect(await draftInvoiceLineItems({ clientName: "Great White", lines })).toEqual(FALLBACK);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("never calls the model when none is configured", async () => {
    modelConfigured.mockReturnValue(false);

    expect(await draftInvoiceLineItems({ clientName: "Great White", lines })).toEqual(FALLBACK);
    expect(generateText).not.toHaveBeenCalled();
  });
});
