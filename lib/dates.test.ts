import { describe, expect, it } from "vitest";

import { addDays, isRealDate, noonUTC, utcDate } from "@/lib/dates";

describe("isRealDate", () => {
  it.each(["2026-08-01", "2024-02-29", "2000-02-29", "1999-12-31"])(
    "accepts %s",
    (value) => {
      expect(isRealDate(value)).toBe(true);
    },
  );

  it("rejects a day that does not exist in that month", () => {
    // The regex alone would accept this; `new Date` would roll it into March.
    // Go's time.Parse returns "day out of range", and so must we.
    expect(isRealDate("2026-02-31")).toBe(false);
    expect(isRealDate("2025-02-29")).toBe(false);
  });

  it("does not throw on a month outside 1-12", () => {
    // Regression guard. `new Date("2026-13-01T00:00:00Z")` is an Invalid Date,
    // and calling .toISOString() on it throws a RangeError. A refinement that
    // throws escapes zod as an unhandled error, turning what should be a 400
    // into a 500.
    expect(() => isRealDate("2026-13-01")).not.toThrow();
    expect(isRealDate("2026-13-01")).toBe(false);
    expect(isRealDate("2026-00-10")).toBe(false);
  });

  it.each([
    "",
    "banana",
    "2026-8-1", // unpadded
    "26-08-01", // two-digit year
    "2026-08-01T00:00:00Z", // a full timestamp
    "2026-08-01 ", // trailing space
  ])("rejects %o", (value) => {
    expect(isRealDate(value)).toBe(false);
  });
});

describe("utcDate", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(utcDate(new Date("2026-08-01T12:00:00Z"))).toBe("2026-08-01");
  });

  it("follows UTC, not the server's local day", () => {
    // 23:30 UTC is already 2 August in Nairobi (UTC+3). Every date the server
    // assigns is UTC so that the schema's date comparisons agree with it.
    expect(utcDate(new Date("2026-08-01T23:30:00Z"))).toBe("2026-08-01");
  });
});

describe("noonUTC", () => {
  it("samples at 12:00:00 UTC, not midnight", () => {
    // §7.7 pins this: midnight sits on a lunar phase boundary for a good share
    // of the days in a synodic month, so a midnight sample reports the wrong
    // phase for any day whose transition falls in the morning.
    expect(noonUTC("2026-08-01").toISOString()).toBe("2026-08-01T12:00:00.000Z");
  });
});

describe("addDays", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("crosses a year boundary backwards", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles a leap day", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
  });
});
