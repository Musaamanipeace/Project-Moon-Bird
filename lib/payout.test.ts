import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";

/**
 * lib/payout.ts reads MOONBIRD_PAYOUT_KEY once at module load and caches the
 * key pair, so each case needs a fresh module registry with the env already in
 * place. vi.resetModules() + dynamic import gives us that.
 */
async function loadModule(key: string | undefined, nodeEnv = "test") {
  vi.resetModules();
  if (key === undefined) {
    delete process.env.MOONBIRD_PAYOUT_KEY;
  } else {
    process.env.MOONBIRD_PAYOUT_KEY = key;
  }
  vi.stubEnv("NODE_ENV", nodeEnv);
  return import("@/lib/payout");
}

/** PKCS8 DER — what `openssl genpkey -algorithm ed25519` and Node emit. */
function pkcs8Key(): { der: Buffer; base64: string } {
  const { privateKey } = generateKeyPairSync("ed25519");
  const der = privateKey.export({ format: "der", type: "pkcs8" }) as Buffer;
  return { der, base64: der.toString("base64") };
}

/** The bare 32-byte seed carried inside a PKCS8 Ed25519 key. */
function seedKey(): string {
  return pkcs8Key().der.subarray(16).toString("base64");
}

const USER_ID = "11111111-1111-1111-1111-111111111111";
const CAMPAIGN_ID = "22222222-2222-2222-2222-222222222222";

const originalKey = process.env.MOONBIRD_PAYOUT_KEY;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalKey === undefined) {
    delete process.env.MOONBIRD_PAYOUT_KEY;
  } else {
    process.env.MOONBIRD_PAYOUT_KEY = originalKey;
  }
});

describe("key loading", () => {
  it("accepts a 48-byte PKCS8 DER key", async () => {
    const payout = await loadModule(pkcs8Key().base64);
    const pub = await payout.getPublicKey();
    expect(Buffer.from(pub, "base64")).toHaveLength(32);
  });

  it("accepts a bare 32-byte seed", async () => {
    const payout = await loadModule(seedKey());
    const pub = await payout.getPublicKey();
    expect(Buffer.from(pub, "base64")).toHaveLength(32);
  });

  it("derives the same public key from a seed and its PKCS8 wrapping", async () => {
    const { der, base64 } = pkcs8Key();
    const fromDer = await (await loadModule(base64)).getPublicKey();
    const fromSeed = await (
      await loadModule(der.subarray(16).toString("base64"))
    ).getPublicKey();
    expect(fromSeed).toBe(fromDer);
  });

  it("derives the public key that actually matches the private key", async () => {
    // Regression: the previous implementation called generateKey() for the
    // public half, so getPublicKey() returned an unrelated random key and
    // every signature it advertised was unverifiable.
    const { der, base64 } = pkcs8Key();
    const payout = await loadModule(base64);

    const { createPrivateKey, createPublicKey } = await import("node:crypto");
    const expected = Buffer.from(
      (
        createPublicKey(
          createPrivateKey({ key: der, format: "der", type: "pkcs8" }),
        ).export({ format: "jwk" }) as { x: string }
      ).x,
      "base64url",
    ).toString("base64");

    expect(await payout.getPublicKey()).toBe(expected);
  });

  it("rejects a key of the wrong length", async () => {
    const payout = await loadModule(Buffer.alloc(20).toString("base64"));
    await expect(payout.getPublicKey()).rejects.toThrow(/got 20 bytes/);
  });

  it("rejects 48 bytes that are not a PKCS8 Ed25519 key", async () => {
    const payout = await loadModule(Buffer.alloc(48, 7).toString("base64"));
    await expect(payout.getPublicKey()).rejects.toThrow(/not a PKCS8 Ed25519 key/);
  });

  it("rejects a missing key rather than inventing one", async () => {
    // Fail closed (A7): no throwaway key, no dev-secret fallback.
    const payout = await loadModule(undefined);
    await expect(payout.getPublicKey()).rejects.toThrow(/is not set/);
  });
});

describe("completion tokens", () => {
  let payout: typeof import("@/lib/payout");

  beforeEach(async () => {
    payout = await loadModule(pkcs8Key().base64);
  });

  it("signs a token that verifies against the module key", async () => {
    const { signature, issuedAt } = await payout.signCompletionToken(
      USER_ID,
      CAMPAIGN_ID,
      "nonce-abc",
    );
    const claim = {
      user_id: USER_ID,
      campaign_id: CAMPAIGN_ID,
      nonce: "nonce-abc",
      issued_at: issuedAt,
    };
    expect(await payout.verifyCompletionToken(claim, signature)).toBe(true);
  });

  it("verifies against the advertised public key", async () => {
    const pub = await payout.getPublicKey();
    const { signature, issuedAt } = await payout.signCompletionToken(
      USER_ID,
      CAMPAIGN_ID,
      "nonce-abc",
    );
    const claim = {
      user_id: USER_ID,
      campaign_id: CAMPAIGN_ID,
      nonce: "nonce-abc",
      issued_at: issuedAt,
    };
    expect(await payout.verifyCompletionToken(claim, signature, pub)).toBe(true);
  });

  it("returns an issuedAt in whole seconds", async () => {
    const before = Math.floor(Date.now() / 1000);
    const { issuedAt } = await payout.signCompletionToken(
      USER_ID,
      CAMPAIGN_ID,
      "n",
    );
    expect(Number.isInteger(issuedAt)).toBe(true);
    expect(issuedAt).toBeGreaterThanOrEqual(before);
  });

  it.each([
    ["nonce", { nonce: "evil" }],
    ["user_id", { user_id: "33333333-3333-3333-3333-333333333333" }],
    ["campaign_id", { campaign_id: "44444444-4444-4444-4444-444444444444" }],
    ["issued_at", { issued_at: 1 }],
  ])("rejects a tampered %s", async (_field, override) => {
    const { signature, issuedAt } = await payout.signCompletionToken(
      USER_ID,
      CAMPAIGN_ID,
      "nonce-abc",
    );
    const claim = {
      user_id: USER_ID,
      campaign_id: CAMPAIGN_ID,
      nonce: "nonce-abc",
      issued_at: issuedAt,
      ...override,
    };
    expect(await payout.verifyCompletionToken(claim, signature)).toBe(false);
  });

  it("rejects a signature from a different key", async () => {
    const { signature, issuedAt } = await payout.signCompletionToken(
      USER_ID,
      CAMPAIGN_ID,
      "nonce-abc",
    );
    const claim = {
      user_id: USER_ID,
      campaign_id: CAMPAIGN_ID,
      nonce: "nonce-abc",
      issued_at: issuedAt,
    };
    const otherPub = await (await loadModule(pkcs8Key().base64)).getPublicKey();
    expect(await payout.verifyCompletionToken(claim, signature, otherPub)).toBe(
      false,
    );
  });

  it("returns false rather than throwing on malformed input", async () => {
    const claim = {
      user_id: USER_ID,
      campaign_id: CAMPAIGN_ID,
      nonce: "n",
      issued_at: 1,
    };
    expect(await payout.verifyCompletionToken(claim, "not-base64!!")).toBe(false);
    expect(await payout.verifyCompletionToken(claim, "AAAA", "not-a-key")).toBe(
      false,
    );
  });
});
