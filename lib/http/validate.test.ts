import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseBody } from "@/lib/http/validate";
import { challengeProgressSchema, settingsSchema } from "@/lib/schemas";

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
    const tooBig = { data: { blob: "x".repeat(10_001) } };
    const out = await parseBody(
      req(JSON.stringify(tooBig)),
      challengeProgressSchema,
    );
    expect((out as Response).status).toBe(400);

    const ok = { data: { blob: "x" } };
    const good = await parseBody(
      req(JSON.stringify(ok)),
      challengeProgressSchema,
    );
    expect(good).toEqual(ok);
  });

  it("rejects a client-supplied log date (§5.3 server-assigns it)", async () => {
    // The log date must not be forgeable: a caller who could backdate a
    // completion could repair a broken streak after the fact.
    const out = await parseBody(
      req('{"completed":true,"logDate":"2020-01-01"}'),
      challengeProgressSchema,
    );
    expect((out as Response).status).toBe(400);
  });

  it("passes through zod coercion/defaults", async () => {
    const schema = z.object({ n: z.number().default(7) }).strict();
    expect(await parseBody(req("{}"), schema)).toEqual({ n: 7 });
  });
});

describe("parseBody options", () => {
  it("overrides the malformed-JSON body", async () => {
    const out = (await parseBody(req("{"), settingsSchema, {
      invalidJson: "invalid body",
    })) as Response;
    expect(await out.text()).toBe('{"error":"invalid body"}\n');
    expect(out.status).toBe(400);
  });

  it("overrides the schema-rejection body", async () => {
    const out = (await parseBody(req('{"nope":1}'), settingsSchema, {
      message: () => "email and password are required",
    })) as Response;
    expect(await out.text()).toBe(
      '{"error":"email and password are required"}\n',
    );
  });

  it("gives the mapper the raw body, so §4.8 can split its two 400s", async () => {
    // Go decoded into a *string and only then checked membership, so a bad
    // enum value and a decode failure carry different bodies. The mapper needs
    // the raw value to tell them apart.
    const message = (_e: z.ZodError, raw: unknown) =>
      typeof (raw as Record<string, unknown>)?.preferredMethod === "string"
        ? "preferredMethod must be 'otp' or 'password'"
        : "invalid body";

    const badEnum = (await parseBody(
      req('{"preferredMethod":"carrier-pigeon"}'),
      settingsSchema,
      { message },
    )) as Response;
    expect(await badEnum.text()).toBe(
      '{"error":"preferredMethod must be \'otp\' or \'password\'"}\n',
    );

    const wrongType = (await parseBody(
      req('{"preferredMethod":42}'),
      settingsSchema,
      { message },
    )) as Response;
    expect(await wrongType.text()).toBe('{"error":"invalid body"}\n');
  });

  it("keeps the default bodies when no options are given", async () => {
    const malformed = (await parseBody(req("{"), settingsSchema)) as Response;
    expect(await malformed.text()).toBe('{"error":"invalid json"}\n');

    const rejected = (await parseBody(
      req('{"nope":1}'),
      settingsSchema,
    )) as Response;
    expect(await rejected.text()).toBe('{"error":"invalid request body"}\n');
  });
});
