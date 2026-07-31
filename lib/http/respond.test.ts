import { describe, expect, it } from "vitest";

import {
  badRequest,
  escapeHTML,
  json,
  methodNotAllowed,
  noContent,
  unauthorized,
} from "@/lib/http/respond";

// The separators are constructed, never written literally: a raw U+2028 in
// source gets normalized away by editors and tooling, which would make these
// tests silently vacuous.
const SEP_LINE = String.fromCharCode(0x2028);
const SEP_PARA = String.fromCharCode(0x2029);

describe("escapeHTML", () => {
  it("escapes < > & the way Go's json.Marshal does", () => {
    expect(escapeHTML('{"t":"a<b>c&d"}')).toBe(
      '{"t":"a\\u003cb\\u003ec\\u0026d"}',
    );
  });

  it("escapes U+2028 and U+2029, leaving no raw separators", () => {
    const out = escapeHTML(`{"s":"x${SEP_LINE}y${SEP_PARA}z"}`);
    expect(out).toBe('{"s":"x\\u2028y\\u2029z"}');
    expect(out.includes(SEP_LINE)).toBe(false);
    expect(out.includes(SEP_PARA)).toBe(false);
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHTML('{"t":"plain"}')).toBe('{"t":"plain"}');
  });
});

describe("json", () => {
  it("appends the trailing newline (§1.1)", async () => {
    const res = json({ ok: true });
    expect(await res.text()).toBe('{"ok":true}\n');
  });

  it("sets application/json with no charset", () => {
    expect(json({ ok: true }).headers.get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("preserves the key order the handler wrote", async () => {
    // Handlers write keys alphabetically per each route's spec (§1.2);
    // json() must not reorder or normalize them.
    const res = json({ authMethod: "otp", createdAt: "t", displayName: "d" });
    expect(await res.text()).toBe(
      '{"authMethod":"otp","createdAt":"t","displayName":"d"}\n',
    );
  });

  it("preserves null rather than coercing to [] (§1.5)", async () => {
    const res = json({ badges: null });
    expect(await res.text()).toBe('{"badges":null}\n');
  });

  it("escapes HTML in serialized values", async () => {
    const res = json({ title: "a<b>&c" });
    expect(await res.text()).toBe('{"title":"a\\u003cb\\u003e\\u0026c"}\n');
  });

  it("defaults to 200 and honours an explicit status", () => {
    expect(json({}).status).toBe(200);
    expect(json({}, 201).status).toBe(201);
  });
});

describe("unauthorized", () => {
  it("is the one body with NO trailing newline (§1.4)", async () => {
    const res = unauthorized();
    const body = await res.text();
    expect(body).toBe('{"error":"unauthorized"}');
    expect(body.endsWith("\n")).toBe(false);
    expect(res.status).toBe(401);
  });
});

describe("error helpers", () => {
  it("badRequest is 400 and newline-terminated", async () => {
    const res = badRequest("invalid json");
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('{"error":"invalid json"}\n');
  });

  it("methodNotAllowed sets the Allow header (§1.6)", async () => {
    const res = methodNotAllowed(["GET", "POST"]);
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, POST");
    expect(await res.text()).toBe('{"error":"method not allowed"}\n');
  });

  it("noContent is 204 with an empty body", async () => {
    const res = noContent();
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });
});
