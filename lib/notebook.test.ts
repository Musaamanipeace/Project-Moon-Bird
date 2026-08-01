import { describe, expect, it } from "vitest";

import { eventErrorFor } from "@/lib/events";
import { normalizeDueDate, notebookErrorFor } from "@/lib/notebook";
import { eventPublic } from "@/lib/serializers/events";
import { notebookPublic } from "@/lib/serializers/notebook";

describe("notebookPublic", () => {
  const row = {
    id: "e1",
    entry_type: "dream",
    title: "Eclipse",
    body: "text",
    due_date: "2026-09-01",
    created_at: "2026-08-01T10:20:30.123456+00:00",
    updated_at: "2026-08-02T11:00:00+00:00",
  };

  it("emits exactly the seven §6.5 keys, alphabetically", () => {
    expect(Object.keys(notebookPublic(row))).toEqual([
      "body",
      "createdAt",
      "dueDate",
      "entryType",
      "id",
      "title",
      "updatedAt",
    ]);
  });

  it("never leaks user_id", () => {
    const out = notebookPublic({ ...row, user_id: "u1" } as never);
    expect(out).not.toHaveProperty("user_id");
  });

  it("uses second-precision RFC3339 for timestamps", () => {
    const out = notebookPublic(row);
    expect(out.createdAt).toBe("2026-08-01T10:20:30Z");
    expect(out.updatedAt).toBe("2026-08-02T11:00:00Z");
  });

  it("passes dueDate through verbatim rather than reformatting", () => {
    // It is a `date` column, not an instant. Parsing and reformatting would
    // shift the day for any server west of UTC.
    expect(notebookPublic(row).dueDate).toBe("2026-09-01");
    expect(notebookPublic({ ...row, due_date: null }).dueDate).toBeNull();
  });
});

describe("normalizeDueDate", () => {
  // Absent, explicit null, and "" all mean "no due date" — Go treated a nil
  // *string and an empty string identically, and both become SQL NULL.
  it.each([undefined, null, ""])("collapses %o to null", (value) => {
    expect(normalizeDueDate(value)).toBeNull();
  });

  it("keeps a real date", () => {
    expect(normalizeDueDate("2026-09-01")).toBe("2026-09-01");
  });
});

describe("notebookErrorFor", () => {
  // §6.2/§6.3 name three distinct 400 bodies for what zod collapses into one
  // parse failure, and the order they are checked in is Go's: decode, then the
  // handler's dueDate parse, then the store's entry-type check.

  it.each([null, "string", 42, []])(
    "returns 'invalid body' for a non-object payload (%o)",
    (raw) => {
      expect(notebookErrorFor(raw)).toBe("invalid body");
    },
  );

  it("returns 'invalid body' for a non-string dueDate", () => {
    // Go decoded into *string, so a number never reached the date parse.
    expect(notebookErrorFor({ entryType: "dream", dueDate: 5 })).toBe(
      "invalid body",
    );
  });

  it("names the dueDate before the entry type", () => {
    // Both are wrong here; §6.3's ordering makes the date the reported one.
    expect(
      notebookErrorFor({ entryType: "nonsense", dueDate: "2026-02-31" }),
    ).toBe("dueDate must be YYYY-MM-DD");
  });

  it.each([null, "", undefined])(
    "treats %o as no due date and falls through to the entry type",
    (dueDate) => {
      expect(notebookErrorFor({ entryType: "nonsense", dueDate })).toBe(
        "invalid entry_type",
      );
    },
  );

  it("reports invalid entry_type in snake_case, as the contract has it", () => {
    // It came from a store-level err.Error(), not the handler, so it is not
    // camelCase like its neighbours. Reproduced verbatim rather than tidied.
    expect(notebookErrorFor({ entryType: "nonsense" })).toBe(
      "invalid entry_type",
    );
  });

  it("returns 'invalid body' when entryType is missing entirely", () => {
    expect(notebookErrorFor({ title: "x" })).toBe("invalid body");
  });
});

describe("eventPublic", () => {
  const row = {
    id: "ev1",
    title: "Perseids",
    event_date: "2026-08-12",
    rarity: "annual",
    synopsis: "meteor shower",
    category: "astronomical",
    source: "IMO",
    tier: "astronomical",
    approved: true,
    author_id: null,
  };

  it("emits exactly the ten §7.6 keys, alphabetically", () => {
    expect(Object.keys(eventPublic(row))).toEqual([
      "approved",
      "authorId",
      "category",
      "eventDate",
      "id",
      "rarity",
      "source",
      "synopsis",
      "tier",
      "title",
    ]);
  });

  it("emits authorId as null or a string", () => {
    expect(eventPublic(row).authorId).toBeNull();
    expect(eventPublic({ ...row, author_id: "u1" }).authorId).toBe("u1");
  });

  it("does not emit visibility", () => {
    // The column exists to close audit finding B4, but types/api.ts:MoonEvent
    // has no field for it — adding it silently would change the shape the
    // client is typed against. Enforced in the predicate and RLS instead.
    const out = eventPublic({ ...row, visibility: "private" } as never);
    expect(out).not.toHaveProperty("visibility");
  });

  it("keeps eventDate date-only", () => {
    expect(eventPublic(row).eventDate).toBe("2026-08-12");
  });
});

describe("eventErrorFor", () => {
  it.each([null, "string", 42])(
    "returns 'invalid body' for a non-object payload (%o)",
    (raw) => {
      expect(eventErrorFor(raw)).toBe("invalid body");
    },
  );

  // Wrong types would have failed Go's decode into a string field, which is the
  // "invalid body" branch rather than either of the named ones.
  it.each([
    { title: 5, eventDate: "2026-08-12" },
    { title: "x", eventDate: 5 },
    { title: "x" },
  ])("returns 'invalid body' for %o", (raw) => {
    expect(eventErrorFor(raw)).toBe("invalid body");
  });

  it("names the title before the date, as Go checked them", () => {
    expect(eventErrorFor({ title: "   ", eventDate: "" })).toBe(
      "title is required",
    );
  });

  it("reports an empty date once the title is present", () => {
    expect(eventErrorFor({ title: "x", eventDate: "" })).toBe(
      "eventDate is required",
    );
  });

  it("reports a malformed date with the store's wording", () => {
    expect(eventErrorFor({ title: "x", eventDate: "2026-02-31" })).toBe(
      "eventDate must be a valid date (YYYY-MM-DD)",
    );
  });

  it("falls back to 'invalid body' when only a length cap failed", () => {
    // The B7 caps are new in this port; §7.2 names no string for them.
    expect(eventErrorFor({ title: "x", eventDate: "2026-08-12" })).toBe(
      "invalid body",
    );
  });
});
