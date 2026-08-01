import { describe, expect, it } from "vitest";

import {
  challengePublic,
  isCompleted,
  statePublic,
  type ChallengeStatus,
} from "@/lib/serializers/challenges";

const CHALLENGE = {
  id: "c1",
  slug: "sky-watcher-l1",
  title: "Sky Watcher L1",
  description: "desc",
  prompt: "prompt",
  moon_phase: "Any",
  icon: "🔭",
  sort_order: 1,
  // Present on the row, deliberately not serialized:
  scope: "Skills-Related",
};

function log(overrides: Partial<Parameters<typeof statePublic>[0]> = {}) {
  return {
    challenge_id: "c1",
    log_date: "2026-08-01",
    data: { taps: 3 },
    status: "unfinished" as ChallengeStatus,
    updated_at: "2026-08-01T10:20:30.456Z",
    ...overrides,
  };
}

describe("challengePublic (§5.4)", () => {
  it("emits keys in the contract's alphabetical order", () => {
    expect(Object.keys(challengePublic(CHALLENGE))).toEqual([
      "description",
      "icon",
      "id",
      "moonPhase",
      "prompt",
      "slug",
      "sortOrder",
      "title",
    ]);
  });

  it("does not leak columns outside the contract", () => {
    expect(challengePublic(CHALLENGE)).not.toHaveProperty("scope");
  });

  it("keeps userState sorting last when merged (§5.1)", () => {
    // §5.1 appends userState to challengePublic's map; Go's sorted output puts
    // it after "title", which is only true because u > t.
    const item = { ...challengePublic(CHALLENGE), userState: null };
    expect(Object.keys(item).at(-1)).toBe("userState");
    expect([...Object.keys(item)]).toEqual([...Object.keys(item)].sort());
  });
});

describe("statePublic (§5.5)", () => {
  it("emits keys in the contract's alphabetical order", () => {
    expect(Object.keys(statePublic(log(), "sky-watcher-l1"))).toEqual([
      "challengeId",
      "completed",
      "data",
      "logDate",
      "slug",
      "updatedAt",
    ]);
  });

  it("passes logDate through verbatim rather than reparsing it", () => {
    // Parsing "2026-08-01" into a Date and reformatting in local time shifts the
    // day for anyone west of UTC.
    expect(statePublic(log(), "s").logDate).toBe("2026-08-01");
  });

  it("formats updatedAt as RFC3339 at second precision", () => {
    expect(statePublic(log(), "s").updatedAt).toBe("2026-08-01T10:20:30Z");
  });

  it("never serializes completedAt", () => {
    expect(statePublic(log(), "s")).not.toHaveProperty("completedAt");
  });

  it.each([
    ["null", null],
    ["an array", [1, 2]],
    ["a scalar", 7],
  ])("normalises %s data to an empty object", (_label, data) => {
    expect(statePublic(log({ data }), "s").data).toEqual({});
  });

  it("uses the slug the caller supplies, not one off the log row", () => {
    // challenge_logs has no slug column; it is joined in from the challenge.
    expect(statePublic(log(), "who-am-i").slug).toBe("who-am-i");
  });
});

describe("isCompleted", () => {
  it("treats only 'finished' as completed", () => {
    expect(isCompleted("finished")).toBe(true);
  });

  it.each<ChallengeStatus>(["unfinished", "completed_unaudited", "evolving"])(
    "treats %s as not completed",
    (status) => {
      // completed_unaudited especially: reporting it as completed would release
      // the badge and the streak day before a peer auditor has approved it.
      expect(isCompleted(status)).toBe(false);
      expect(statePublic(log({ status }), "s").completed).toBe(false);
    },
  );
});
