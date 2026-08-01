import { describe, expect, it, vi } from "vitest";

import { latestLogsByChallenge, utcLogDate } from "@/lib/challenges";

/**
 * Minimal stand-in for the PostgREST query builder: every chained method
 * returns `this`, and the terminal `await` resolves to the canned result. Only
 * the methods latestLogsByChallenge actually calls are implemented, so a change
 * in the query shape shows up as a TypeError rather than passing silently.
 */
function stubClient(result: { data: unknown; error: unknown }) {
  const calls: Array<[string, unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order"]) {
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

describe("utcLogDate", () => {
  it("formats as YYYY-MM-DD in UTC", () => {
    expect(utcLogDate(new Date("2026-08-01T12:00:00Z"))).toBe("2026-08-01");
  });

  it("uses UTC, not the server's local day", () => {
    // 23:30 UTC is already the next day in Nairobi (UTC+3). The log date must
    // follow UTC so that recompute_streak, which compares against UTC, agrees.
    const late = new Date("2026-08-01T23:30:00Z");
    expect(utcLogDate(late)).toBe("2026-08-01");
  });

  it("defaults to now", () => {
    expect(utcLogDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("latestLogsByChallenge", () => {
  it("keeps only the newest row per challenge", async () => {
    const { client } = stubClient({
      data: [
        { challenge_id: "a", log_date: "2026-08-02", updated_at: "z" },
        { challenge_id: "b", log_date: "2026-08-01", updated_at: "z" },
        { challenge_id: "a", log_date: "2026-07-30", updated_at: "z" },
      ],
      error: null,
    });

    const logs = await latestLogsByChallenge(client, "u1");
    expect(logs?.size).toBe(2);
    expect(logs?.get("a")?.log_date).toBe("2026-08-02");
  });

  it("orders newest-first so the first sighting wins", async () => {
    const { client, calls } = stubClient({ data: [], error: null });
    await latestLogsByChallenge(client, "u1");

    const orders = calls.filter(([m]) => m === "order").map(([, args]) => args);
    expect(orders).toEqual([
      ["log_date", { ascending: false }],
      ["updated_at", { ascending: false }],
    ]);
  });

  it("returns an empty map, not null, when the user has no logs", async () => {
    // §5.1 distinguishes "no progress" (200) from "could not load progress"
    // (500); collapsing them would 500 every brand-new account.
    const { client } = stubClient({ data: [], error: null });
    expect((await latestLogsByChallenge(client, "u1"))?.size).toBe(0);
  });

  it("returns null on a query error", async () => {
    const { client } = stubClient({ data: null, error: { message: "boom" } });
    expect(await latestLogsByChallenge(client, "u1")).toBeNull();
  });

  it("scopes the query to the requesting user", async () => {
    const { client, calls } = stubClient({ data: [], error: null });
    await latestLogsByChallenge(client, "u1");
    expect(calls).toContainEqual(["eq", ["user_id", "u1"]]);
  });
});

describe("recomputeStreakQuietly", () => {
  it("swallows RPC failures so a save is never reported as lost", async () => {
    // §5.3: Go ran RecomputeStreak with its error deliberately discarded. The
    // log is already committed by this point.
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminSupabaseClient: () => ({
        rpc: () => Promise.reject(new Error("unreachable")),
      }),
    }));

    const { recomputeStreakQuietly } = await import("@/lib/challenges");
    await expect(recomputeStreakQuietly("u1")).resolves.toBeUndefined();
    vi.doUnmock("@/lib/supabase/admin");
  });
});
