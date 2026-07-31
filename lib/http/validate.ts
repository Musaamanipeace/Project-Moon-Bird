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
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T> | Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("invalid json");
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return badRequest("invalid request body");
  }

  return result.data;
}

export { escapeHTML } from "@/lib/http/respond";
