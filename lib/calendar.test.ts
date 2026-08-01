import { describe, expect, it } from "vitest";

import { completedSlugsForRange } from "@/lib/calendar";
import { noonUTC } from "@/lib/dates";
import { age, illumination, phaseCode, phaseEmoji, phaseName } from "@/lib/lunar";

/**
 * Stand-in for the PostgREST query builder. Chained methods return `this` and
 * record their arguments, so the query *shape* is asserted rather than just the
 * mapped result — a predicate silently dropped in a refactor would otherwise
 * pass every one of these.
 */
function stubClient(result: { data: unknown; error: unknown }) {
  const calls: Array<[string, unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "lte"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return {
    calls,
    client: {
      from: (table: string) => {
        calls.push(["from", [table]]);
        return builder;
      },
    } as never,
  };
}

const row = (log_date: string, slug: string) => ({
  log_date,
  challenges: { slug },
});

describe("completedSlugsForRange", () => {
  it("groups slugs by day", async () => {
    const { client } = stubClient({
      data: [
        row("2026-08-01", "moon-gaze"),
        row("2026-08-01", "vital-check"),
        row("2026-08-03", "dream-log"),
      ],
      error: null,
    });

    const out = await completedSlugsForRange(client, "u1", "2026-08-01", "2026-08-31");

    expect(out?.get("2026-08-01")).toEqual(["moon-gaze", "vital-check"]);
    expect(out?.get("2026-08-03")).toEqual(["dream-log"]);
  });

  it("omits days with no completions rather than mapping them to []", async () => {
    // This is the whole reason it returns a Map. §16 requires the route to emit
    // `null`, not `[]`, for an empty day, and it can only tell the difference if
    // the key is absent.
    const { client } = stubClient({ data: [row("2026-08-01", "a")], error: null });

    const out = await completedSlugsForRange(client, "u1", "2026-08-01", "2026-08-31");

    expect(out?.has("2026-08-02")).toBe(false);
    expect(out?.get("2026-08-02")).toBeUndefined();
  });

  it("returns an empty map, not null, when nothing was completed", async () => {
    // An empty month is a successful query. Conflating it with a failure would
    // turn a quiet month into a 500.
    const { client } = stubClient({ data: [], error: null });

    const out = await completedSlugsForRange(client, "u1", "2026-08-01", "2026-08-31");

    expect(out).toBeInstanceOf(Map);
    expect(out?.size).toBe(0);
  });

  it("returns null on query failure so the route can raise its 500", async () => {
    const { client } = stubClient({ data: null, error: { message: "boom" } });

    expect(
      await completedSlugsForRange(client, "u1", "2026-08-01", "2026-08-31"),
    ).toBeNull();
  });

  it("filters to the user, to 'finished', and to the range", async () => {
    const { client, calls } = stubClient({ data: [], error: null });

    await completedSlugsForRange(client, "u1", "2026-08-01", "2026-08-31");

    const eqs = calls.filter(([m]) => m === "eq").map(([, args]) => args);
    expect(eqs).toContainEqual(["user_id", "u1"]);
    // 'completed_unaudited' is a Long Challenge awaiting audit. Counting it
    // would fill in the calendar for work that has not been accepted.
    expect(eqs).toContainEqual(["status", "finished"]);
    expect(calls).toContainEqual(["gte", ["log_date", "2026-08-01"]]);
    expect(calls).toContainEqual(["lte", ["log_date", "2026-08-31"]]);
  });

  it("skips a row whose joined challenge is missing", async () => {
    const { client } = stubClient({
      data: [{ log_date: "2026-08-01", challenges: null }],
      error: null,
    });

    const out = await completedSlugsForRange(client, "u1", "2026-08-01", "2026-08-31");

    expect(out?.size).toBe(0);
  });
});

describe("calendar day sampling", () => {
  it("samples at noon, which differs from midnight near a phase boundary", () => {
    // The point of §7.7's noon rule. This search asserts such a day exists in a
    // realistic window — if sampling ever silently reverted to midnight, some
    // day in a year would report a different phase than the contract specifies.
    const differs: string[] = [];
    for (let d = 1; d <= 28; d += 1) {
      const date = `2026-08-${String(d).padStart(2, "0")}`;
      const atNoon = phaseName(age(noonUTC(date)));
      const atMidnight = phaseName(age(new Date(`${date}T00:00:00Z`)));
      if (atNoon !== atMidnight) differs.push(date);
    }
    expect(differs.length).toBeGreaterThan(0);
  });

  it("keeps phase, code, and emoji on the same boundaries", () => {
    // §13.5: all three functions use one threshold table. A day where they
    // disagree means one chain was edited without the others.
    const names = new Map<string, [string, string]>();
    for (let d = 0; d < 60; d += 1) {
      const at = new Date(Date.UTC(2026, 0, 1 + d, 12));
      const a = age(at);
      const seen = names.get(phaseName(a));
      const pair: [string, string] = [phaseCode(a), phaseEmoji(a)];
      if (seen) expect(pair).toEqual(seen);
      else names.set(phaseName(a), pair);
    }
    // A 60-day window spans two synodic months, so every phase should appear.
    expect(names.size).toBe(8);
  });

  it("reports illumination as a 0-100 percentage", () => {
    for (let d = 0; d < 30; d += 1) {
      const value = illumination(age(new Date(Date.UTC(2026, 0, 1 + d, 12))));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});
