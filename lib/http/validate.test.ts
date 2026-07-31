import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseBody } from "@/lib/http/validate";
import { challengeSaveSchema, settingsSchema } from "@/lib/schemas";

function req(body: string): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("parseBody", () => {
  it("returns the parsed value for a valid body", async () => {
    const out = await parseBody(
      req('{"notificationsEnabled":true}'),
      settingsSchema,
    );
    expect(out).toEqual({ notificationsEnabled: true });
  });

  it("rejects unknown keys with 400 (Go DisallowUnknownFields — §1.3)", async () => {
    const out = await parseBody(
      req('{"notificationsEnabled":true,"isAdvertiser":true}'),
      settingsSchema,
    );
    expect(out).toBeInstanceOf(Response);
    expect((out as Response).status).toBe(400);
  });

  it("rejects privilege-escalating keys on settings (A1)", async () => {
    // is_advertiser / role must never be user-writable; the schema is the
    // first gate, the column grant in 0008_rls.sql is the second.
    for (const body of ['{"role":"admin"}', '{"isAdvertiser":true}']) {
      const out = await parseBody(req(body), settingsSchema);
      expect((out as Response).status).toBe(400);
    }
  });

  it("rejects malformed JSON with 400", async () => {
    const out = await parseBody(req("{not json"), settingsSchema);
    expect(out).toBeInstanceOf(Response);
    expect((out as Response).status).toBe(400);
  });

  it("rejects a value that violates the schema type", async () => {
    const out = await parseBody(
      req('{"preferredMethod":"carrier-pigeon"}'),
      settingsSchema,
    );
    expect((out as Response).status).toBe(400);
  });

  it("newline-terminates the 400 body", async () => {
    const out = (await parseBody(req("{"), settingsSchema)) as Response;
    expect(await out.text()).toBe('{"error":"invalid json"}\n');
  });

  it("enforces the serialized-size cap on challenge data", async () => {
    const tooBig = { slug: "s", data: { blob: "x".repeat(10_001) } };
    const out = await parseBody(req(JSON.stringify(tooBig)), challengeSaveSchema);
    expect((out as Response).status).toBe(400);

    const ok = { slug: "s", data: { blob: "x" } };
    const good = await parseBody(req(JSON.stringify(ok)), challengeSaveSchema);
    expect(good).toEqual(ok);
  });

  it("passes through zod coercion/defaults", async () => {
    const schema = z.object({ n: z.number().default(7) }).strict();
    expect(await parseBody(req("{}"), schema)).toEqual({ n: 7 });
  });
});
