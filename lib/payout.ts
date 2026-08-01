import "server-only";

import { createPrivateKey, createPublicKey } from "node:crypto";

let _keyPair: CryptoKeyPair | null = null;
let _publicKeyBase64 = "";

const ENV_KEY = process.env.MOONBIRD_PAYOUT_KEY;

// Fail closed (audit A7/A9): a missing signing key must stop the build, not
// silently mint a throwaway key that would validate nothing. The Go backend's
// dev-secret fallback is deliberately not ported.
if (process.env.NODE_ENV === "production" && !ENV_KEY) {
  throw new Error("MOONBIRD_PAYOUT_KEY is required in production");
}

/**
 * DER prefix for a PKCS8-wrapped Ed25519 private key, followed by the 32-byte
 * seed. Used both to recognise a PKCS8 input and to wrap a bare seed into one.
 *
 *   SEQUENCE { INTEGER 0, SEQUENCE { OID 1.3.101.112 }, OCTET STRING { OCTET STRING (32) } }
 */
const PKCS8_ED25519_PREFIX = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
  0x04, 0x22, 0x04, 0x20,
]);

const SEED_LENGTH = 32;
const PKCS8_LENGTH = PKCS8_ED25519_PREFIX.length + SEED_LENGTH;

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

function encodeBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Normalise MOONBIRD_PAYOUT_KEY to PKCS8 DER.
 *
 * Both encodings are accepted because both are things an operator plausibly
 * generates: `openssl genpkey -algorithm ed25519` and Node's generateKeyPair
 * emit PKCS8 (48 bytes), while a hand-rolled `randomBytes(32)` is a bare seed.
 * WebCrypto only imports the former for Ed25519, so a seed gets wrapped.
 */
function toPKCS8(raw: Uint8Array): Uint8Array {
  if (raw.length === SEED_LENGTH) {
    const der = new Uint8Array(PKCS8_LENGTH);
    der.set(PKCS8_ED25519_PREFIX, 0);
    der.set(raw, PKCS8_ED25519_PREFIX.length);
    return der;
  }

  if (raw.length === PKCS8_LENGTH) {
    const prefixMatches = PKCS8_ED25519_PREFIX.every((b, i) => raw[i] === b);
    if (!prefixMatches) {
      throw new Error(
        "MOONBIRD_PAYOUT_KEY is 48 bytes but is not a PKCS8 Ed25519 key",
      );
    }
    return raw;
  }

  throw new Error(
    `MOONBIRD_PAYOUT_KEY must decode to a 32-byte seed or a 48-byte PKCS8 Ed25519 key, got ${raw.length} bytes`,
  );
}

/**
 * Derive the verifying key from the signing key.
 *
 * WebCrypto has no way to do this — an Ed25519 CryptoKey carries no path back
 * to its public half — so node:crypto does the derivation and WebCrypto
 * re-imports the result for verification. The previous implementation called
 * generateKey() here, which produced an unrelated random public key: every
 * token signed by this module failed verification against the key that
 * /api/public-key advertised.
 */
function derivePublicKeyBase64(der: Uint8Array): string {
  // Round-tripped through a private KeyObject rather than handed straight to
  // createPublicKey: the DER here is PKCS8 (a private key), and
  // createPublicKey's object form is typed for public encodings only.
  const privateKey = createPrivateKey({
    key: Buffer.from(der),
    format: "der",
    type: "pkcs8",
  });
  const jwk = createPublicKey(privateKey).export({ format: "jwk" }) as {
    x?: string;
  };

  if (!jwk.x) {
    throw new Error("failed to derive Ed25519 public key from MOONBIRD_PAYOUT_KEY");
  }

  // JWK is base64url; the wire format for /api/public-key is standard base64.
  const base64 = jwk.x.replace(/-/g, "+").replace(/_/g, "/");
  return base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
}

async function loadKeyPair(): Promise<void> {
  if (!ENV_KEY) {
    throw new Error(
      "MOONBIRD_PAYOUT_KEY is not set. Cannot sign completion tokens.",
    );
  }

  let raw: Uint8Array;
  try {
    raw = decodeBase64(ENV_KEY.trim());
  } catch {
    throw new Error("MOONBIRD_PAYOUT_KEY is not valid base64");
  }

  const der = toPKCS8(raw);

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    der,
    "Ed25519",
    false,
    ["sign"],
  );

  const publicKeyBase64 = derivePublicKeyBase64(der);
  const publicKey = await crypto.subtle.importKey(
    "raw",
    decodeBase64(publicKeyBase64),
    "Ed25519",
    true,
    ["verify"],
  );

  _keyPair = { privateKey, publicKey };
  _publicKeyBase64 = publicKeyBase64;
}

export async function getPublicKey(): Promise<string> {
  if (!_keyPair) {
    await loadKeyPair();
  }
  return _publicKeyBase64;
}

interface CompletionClaim {
  user_id: string;
  campaign_id: string;
  nonce: string;
  issued_at: number;
}

export async function signCompletionToken(
  userId: string,
  campaignId: string,
  nonce: string,
): Promise<{ signature: string; issuedAt: number }> {
  if (!_keyPair) {
    await loadKeyPair();
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  // Key order is part of the signed bytes: the claim is signed as serialized
  // JSON, so any reordering here invalidates every previously issued token.
  const claim: CompletionClaim = {
    user_id: userId,
    campaign_id: campaignId,
    nonce,
    issued_at: issuedAt,
  };
  const message = new TextEncoder().encode(JSON.stringify(claim));
  const sig = await crypto.subtle.sign("Ed25519", _keyPair!.privateKey, message);
  return { signature: encodeBase64(new Uint8Array(sig)), issuedAt };
}

export async function verifyCompletionToken(
  claim: CompletionClaim,
  signatureBase64: string,
  publicKeyBase64?: string,
): Promise<boolean> {
  try {
    let pubB64 = publicKeyBase64;
    if (!pubB64) {
      if (!_keyPair) {
        await loadKeyPair();
      }
      pubB64 = _publicKeyBase64;
    }
    if (!pubB64) return false;

    const publicKey = await crypto.subtle.importKey(
      "raw",
      decodeBase64(pubB64),
      "Ed25519",
      false,
      ["verify"],
    );
    const message = new TextEncoder().encode(JSON.stringify(claim));
    return await crypto.subtle.verify(
      "Ed25519",
      publicKey,
      decodeBase64(signatureBase64),
      message,
    );
  } catch {
    return false;
  }
}
