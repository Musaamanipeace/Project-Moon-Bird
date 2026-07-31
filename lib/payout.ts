import "server-only";

let _keyPair: CryptoKeyPair | null = null;
let _publicKeyBase64 = "";

const ENV_KEY = process.env.MOONBIRD_PAYOUT_KEY;

if (process.env.NODE_ENV === "production" && !ENV_KEY) {
  throw new Error(
    "MOONBIRD_PAYOUT_KEY is required in production"
  );
}

async function loadKeyPair(): Promise<void> {
  if (!ENV_KEY) {
    throw new Error(
      "MOONBIRD_PAYOUT_KEY is not set. Cannot sign completion tokens."
    );
  }
  let raw: Uint8Array;
  try {
    raw = Uint8Array.from(
      atob(ENV_KEY),
      (c) => c.charCodeAt(0)
    );
  } catch {
    throw new Error(
      "MOONBIRD_PAYOUT_KEY is not valid base64"
    );
  }
  if (raw.length !== 32) {
    throw new Error(
      `MOONBIRD_PAYOUT_KEY must decode to 32 bytes, got ${raw.length}`
    );
  }
  const privateKey = await crypto.subtle.importKey(
    "raw",
    raw,
    "Ed25519",
    false,
    ["sign"]
  );
  _keyPair = {
    privateKey,
    publicKey: await crypto.subtle.generateKey("Ed25519", true, ["verify"]),
  };
  const pubRaw = await crypto.subtle.exportKey("raw", _keyPair.publicKey);
  _publicKeyBase64 = btoa(
    String.fromCharCode(...new Uint8Array(pubRaw))
  );
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
  nonce: string
): Promise<{ signature: string; issuedAt: number }> {
  if (!_keyPair) {
    await loadKeyPair();
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const claim: CompletionClaim = {
    user_id: userId,
    campaign_id: campaignId,
    nonce,
    issued_at: issuedAt,
  };
  const message = new TextEncoder().encode(JSON.stringify(claim));
  const sig = await crypto.subtle.sign("Ed25519", _keyPair.privateKey, message);
  const signature = btoa(
    String.fromCharCode(...new Uint8Array(sig))
  );
  return { signature, issuedAt };
}

export async function verifyCompletionToken(
  claim: CompletionClaim,
  signatureBase64: string,
  publicKeyBase64?: string
): Promise<boolean> {
  try {
    const pubB64 = publicKeyBase64 ?? _publicKeyBase64;
    if (!pubB64) return false;
    const pubRaw = Uint8Array.from(atob(pubB64), (c) => c.charCodeAt(0));
    const publicKey = await crypto.subtle.importKey(
      "raw",
      pubRaw,
      "Ed25519",
      false,
      ["verify"]
    );
    const sigRaw = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0));
    const message = new TextEncoder().encode(JSON.stringify(claim));
    return crypto.subtle.verify("Ed25519", publicKey, sigRaw, message);
  } catch {
    return false;
  }
}