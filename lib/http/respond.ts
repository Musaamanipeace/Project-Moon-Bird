// Byte-fidelity HTTP response helpers (docs/API_CONTRACTS.md §1, §17).
//
// The frontend and the contract tests depend on exact wire bytes, which a bare
// `Response.json()` cannot produce:
//   - success bodies end with a trailing "\n" (Go writeJSON);
//   - object keys are emitted in the order the handler writes them (handlers
//     write keys alphabetically per each route's spec — §1.2);
//   - `< > &` and the U+2028/U+2029 separators are \u-escaped, matching Go's
//     default json.Marshal HTML-escaping (§1.1);
//   - Content-Type is "application/json" with NO charset;
//   - the RequireAuth 401 is the single body with NO trailing newline (§1.4),
//     because Go writes it via w.Write, not writeJSON.

const JSON_CONTENT_TYPE = "application/json";

// Built from an escape sequence rather than a literal character class: the raw
// U+2028/U+2029 separators are invisible and get normalized away by editors and
// tooling, which would silently break the escaping.
const HTML_ESCAPE_PATTERN = new RegExp("[<>&\\u2028\\u2029]", "g");

/**
 * HTML-escape a serialized JSON string the way Go's encoding/json does by
 * default, so response bytes match the contract.
 */
export function escapeHTML(s: string): string {
  return s.replace(HTML_ESCAPE_PATTERN, (c) => {
    switch (c.charCodeAt(0)) {
      case 0x3c:
        return "\\u003c";
      case 0x3e:
        return "\\u003e";
      case 0x26:
        return "\\u0026";
      case 0x2028:
        return "\\u2028";
      default:
        return "\\u2029";
    }
  });
}

/**
 * Serialize `body` exactly as written (handlers order keys per the contract),
 * HTML-escape it, append the trailing newline, and set the charset-less
 * application/json Content-Type.
 */
export function json(body: unknown, status = 200): Response {
  const payload = escapeHTML(JSON.stringify(body)) + "\n";
  return new Response(payload, {
    status,
    headers: { "Content-Type": JSON_CONTENT_TYPE },
  });
}

/**
 * The one newline-less body (§1.4): status 401, exactly `{"error":"unauthorized"}`.
 * Written via a raw Response, not `json()`, to omit the trailing newline.
 */
export function unauthorized(): Response {
  return new Response('{"error":"unauthorized"}', {
    status: 401,
    headers: { "Content-Type": JSON_CONTENT_TYPE },
  });
}

export function badRequest(message = "bad request"): Response {
  return json({ error: message }, 400);
}

export function notFound(message = "not found"): Response {
  return json({ error: message }, 404);
}

export function methodNotAllowed(allow: string[]): Response {
  const res = json({ error: "method not allowed" }, 405);
  res.headers.set("Allow", allow.join(", "));
  return res;
}

export function error(status: number, message: string): Response {
  return json({ error: message }, status);
}

/** 204 No Content — empty body (the client maps 204 → undefined). */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}
