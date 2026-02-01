// ============================================================================
// Session key derivation strict test suite (X25519 → HKDF → AEAD-ready keys)
// Run: node --test tests/sessionKeys.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

import { deriveSessionKeys } from "../lib/sessionKeys.js";
import { hkdf } from "../lib/hkdf.js";
import { blake2b } from "../lib/blake2b.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Determinism and symmetry
// ---------------------------------------------------------------------------

test("SessionKeys: determinism and symmetry", () => {
  const sharedSecret = crypto.randomBytes(32);
  const context = "NewZone / NZ-CRYPTO-02 / session";

  const a = deriveSessionKeys({
    sharedSecret,
    context,
    hash: "sha512",
    keyLength: 32,
  });

  const b = deriveSessionKeys({
    sharedSecret,
    context,
    hash: "sha512",
    keyLength: 32,
  });

  assert.equal(bytesToHex(a.encKey), bytesToHex(b.encKey));
  assert.equal(bytesToHex(a.decKey), bytesToHex(b.decKey));
  assert.equal(bytesToHex(a.nonceBase), bytesToHex(b.nonceBase));
  assert.equal(bytesToHex(a.sessionId), bytesToHex(b.sessionId));
  assert.equal(bytesToHex(a.contextHash), bytesToHex(b.contextHash));
});

// ---------------------------------------------------------------------------
// Context separation
// ---------------------------------------------------------------------------

test("SessionKeys: context separation", () => {
  const sharedSecret = crypto.randomBytes(32);

  const ctx1 = "NewZone-context-1";
  const ctx2 = "NewZone-context-2";

  const s1 = deriveSessionKeys({
    sharedSecret,
    context: ctx1,
    hash: "sha512",
    keyLength: 32,
  });

  const s2 = deriveSessionKeys({
    sharedSecret,
    context: ctx2,
    hash: "sha512",
    keyLength: 32,
  });

  assert.notEqual(bytesToHex(s1.encKey), bytesToHex(s2.encKey));
  assert.notEqual(bytesToHex(s1.decKey), bytesToHex(s2.decKey));
  assert.notEqual(bytesToHex(s1.nonceBase), bytesToHex(s2.nonceBase));
});

// ---------------------------------------------------------------------------
// Hash variant tests
// ---------------------------------------------------------------------------

test("SessionKeys: hash variants (SHA-512 vs BLAKE2b)", () => {
  const sharedSecret = crypto.randomBytes(32);
  const context = "NZ-CRYPTO-02/hash-variant-test";

  const sSha = deriveSessionKeys({
    sharedSecret,
    context,
    hash: "sha512",
    keyLength: 32,
  });

  const sBlake = deriveSessionKeys({
    sharedSecret,
    context,
    hash: "blake2b",
    keyLength: 32,
  });

  assert.notEqual(bytesToHex(sSha.encKey), bytesToHex(sBlake.encKey));
});

// ---------------------------------------------------------------------------
// Structure and length tests
// ---------------------------------------------------------------------------

test("SessionKeys: structure and lengths", () => {
  const sharedSecret = crypto.randomBytes(32);
  const context = "NZ-CRYPTO-02/structure-test";

  const s = deriveSessionKeys({
    sharedSecret,
    context,
    hash: "sha512",
    keyLength: 32,
  });

  assert.equal(s.encKey.length, 32);
  assert.equal(s.decKey.length, 32);
  assert.equal(s.nonceBase.length, 12);
  assert.equal(s.sessionId.length, 16);
  assert.equal(s.contextHash.length, 32);
});

// ---------------------------------------------------------------------------
// Cross-check with direct HKDF + BLAKE2b
// ---------------------------------------------------------------------------

test("SessionKeys: cross-check with HKDF + BLAKE2b", () => {
  const sharedSecret = crypto.randomBytes(32);
  const context = "NZ-CRYPTO-02/HKDF-cross-check";

  const s = deriveSessionKeys({
    sharedSecret,
    context,
    hash: "sha512",
    keyLength: 32,
  });

  const ctxBytes = Buffer.from(context, "utf8");
  const contextHash = blake2b(ctxBytes, 32);
  const salt = contextHash;

  const info = new Uint8Array(
    Buffer.concat([
      Buffer.from(contextHash),
      Buffer.from("NZ-CRYPTO-02/session-keys", "utf8"),
    ])
  );

  const totalLen = 32 * 2 + 12;
  const okm = hkdf("sha512", salt, sharedSecret, info, totalLen);

  const encKey = okm.subarray(0, 32);
  const decKey = okm.subarray(32, 64);
  const nonceBase = okm.subarray(64, 76);

  assert.equal(bytesToHex(s.encKey), bytesToHex(encKey));
  assert.equal(bytesToHex(s.decKey), bytesToHex(decKey));
  assert.equal(bytesToHex(s.nonceBase), bytesToHex(nonceBase));
});