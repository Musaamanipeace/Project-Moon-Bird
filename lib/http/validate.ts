import type { z } from "zod";

import { badRequest } from "@/lib/http/respond";

/**
 * Read and validate a JSON request body (docs/API_CONTRACTS.md §1.3).
 *
 * Mirrors the Go backend's decoder.DisallowUnknownFields: schemas are .strict(),
 * so an unknown key is rejected rather than ignored. Malformed JSON, a wrong
 * Content-Type, and schema violations all collapse to the same 400 shape —
 * the contract does not expose zod's error detail to the client.
 *
 * Callers branch on `instanceof Response`:
 *
 *   const parsed = await parseBody(request, settingsSchema);
 *   if (parsed instanceof Response) return parsed;
 *
 * The success value is typed from the schema, so handlers get the parsed
 * (coerced, defaulted) output rather than the raw body.
 *
 * `options` exists because a few routes pin a more specific 400 body than the
 * generic one — §4.8, for instance, distinguishes a decode failure
 * (`invalid body`) from a preferredMethod outside the allowed set. The mapper
 * receives the raw decoded JSON alongside the zod error so a handler can
 * reproduce Go's two-step "decode, then check membership" split, which zod
 * collapses into a single parse.
 */
export type ParseBodyOptions = {
  /** 400 body when the request is not valid JSON. Default `"invalid json"`. */
  invalidJson?: string;
  /** 400 body when the schema rejects. Default `"invalid request body"`. */
  message?: (error: z.ZodError, raw: unknown) => string;
};

export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
  options: ParseBodyOptions = {},
): Promise<z.infer<T> | Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest(options.invalidJson ?? "invalid json");
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return badRequest(
      options.message?.(result.error, raw) ?? "invalid request body",
    );
  }

  return result.data;
}

export { escapeHTML } from "@/lib/http/respond";
