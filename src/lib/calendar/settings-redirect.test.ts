import { describe, expect, it } from "vitest";

import { CALENDAR_SETTINGS_PATH } from "./constants";
import { calendarSettingsUrl } from "./settings-redirect";

describe("calendarSettingsUrl", () => {
  it("keeps the Integrations tab and appends OAuth flash params", () => {
    const url = calendarSettingsUrl("http://localhost:3000", {
      calendar: "connected",
    });

    expect(url.pathname).toBe("/settings");
    expect(url.searchParams.get("tab")).toBe("integrations");
    expect(url.searchParams.get("calendar")).toBe("connected");
    expect(CALENDAR_SETTINGS_PATH).toBe("/settings?tab=integrations");
  });

  it("encodes error reasons for the Integrations flash banner", () => {
    const url = calendarSettingsUrl("http://localhost:3000", {
      calendar: "error",
      reason: "access_denied",
    });

    expect(url.toString()).toBe(
      "http://localhost:3000/settings?tab=integrations&calendar=error&reason=access_denied"
    );
  });
});
