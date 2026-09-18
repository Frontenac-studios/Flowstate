import { describe, expect, it } from "vitest";

import { INTERNAL_ERROR_MESSAGE, clientSafeMessage } from "./redact-error";

describe("clientSafeMessage", () => {
  it("replaces an internal error, so a raw query never reaches the UI", () => {
    const leak = 'Failed query: select "org_id", "role" from "org_memberships" params: 2ba8606a';
    expect(clientSafeMessage("INTERNAL_SERVER_ERROR", leak)).toBe(INTERNAL_ERROR_MESSAGE);
  });

  it("keeps messages we wrote for the user", () => {
    expect(clientSafeMessage("BAD_REQUEST", "Name the device this token is for.")).toBe(
      "Name the device this token is for."
    );
    expect(clientSafeMessage("UNAUTHORIZED", "Sign in to continue.")).toBe("Sign in to continue.");
  });
});
