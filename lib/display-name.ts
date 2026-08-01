/**
 * Port of Go's `displayNameFromEmail` (handlers.go:1171, docs/API_CONTRACTS.md
 * §4.2), used to name an account created by the OTP flow.
 *
 * It is reproduced rather than replaced because seeded and pre-existing accounts
 * were named by it: changing the rule would silently rename them on next login.
 *
 * The rule is the local part with dots and underscores turned into spaces and
 * only the FIRST character upper-cased — "ada.lovelace@x.com" becomes
 * "Ada lovelace", not "Ada Lovelace". That is Go's behaviour, not an oversight
 * in this port.
 *
 * The fallback was "Moonbug"; it is "Moon-Bird" here, following the rename.
 */
export const DEFAULT_DISPLAY_NAME = "Moon-Bird";

export function displayNameFromEmail(email: string): string {
  const [local = ""] = email.split("@", 1);
  const spaced = local.replaceAll(".", " ").replaceAll("_", " ");
  if (spaced === "") return DEFAULT_DISPLAY_NAME;

  // Indexing by code point, not by UTF-16 unit: Go iterated []rune, so an
  // astral-plane first character must be upper-cased whole rather than split.
  // Go also kept only the first rune of the upper-cased result, which matters
  // for the few characters that expand ("ß" -> "SS" keeps just "S").
  const chars = [...spaced];
  const [first = ""] = [...(chars[0] ?? "").toUpperCase()];
  return first + chars.slice(1).join("");
}
