// ============================================================================
// ChaCha20-Poly1305 strict test suite (AEAD, node:crypto-backed)
// Run: node --test tests/chacha20poly1305.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { encrypt, decrypt } from "../lib/chacha20poly1305.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Cross-check with node:crypto (authoritative behavior)
// ---------------------------------------------------------------------------

test("ChaCha20-Poly1305: cross-check with node:crypto", () => {
  const key = crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  const aad = Buffer.from("NewZone / NZ-CRYPTO-02 / AEAD");
  const plaintext = Buffer.from("ChaCha20-Poly1305 cross-check test");

  // Our implementation
  const ours = encrypt(key, nonce, plaintext, aad);
  const decrypted = decrypt(key, nonce, ours.ciphertext, ours.tag, aad);
  assert.equal(bytesToHex(decrypted), plaintext.toString("hex"));

  // Node implementation
  const cipher = crypto.createCipheriv("chacha20-poly1305", key, nonce, {
    authTagLength: 16,
  });
  cipher.setAAD(aad, { plaintextLength: plaintext.length });
  const c1 = cipher.update(plaintext);
  const c2 = cipher.final();
  const nodeCt = Buffer.concat([c1, c2]);
  const nodeTag = cipher.getAuthTag();

  assert.equal(bytesToHex(ours.ciphertext), nodeCt.toString("hex"));
  assert.equal(bytesToHex(ours.tag), nodeTag.toString("hex"));
});

// ---------------------------------------------------------------------------
// Random roundtrip tests
// ---------------------------------------------------------------------------

test("ChaCha20-Poly1305: random roundtrip (20 cases)", () => {
  for (let i = 0; i < 20; i++) {
    const key = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(12);
    const aad = crypto.randomBytes(20);
    const plaintext = crypto.randomBytes(200);

    const { ciphertext, tag } = encrypt(key, nonce, plaintext, aad);
    const decrypted = decrypt(key, nonce, ciphertext, tag, aad);

    assert.equal(bytesToHex(decrypted), plaintext.toString("hex"));
  }
});

// ---------------------------------------------------------------------------
// Tampering tests (ciphertext, tag, AAD, nonce)
// ---------------------------------------------------------------------------

test("ChaCha20-Poly1305: tampering detection", () => {
  const key = crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  const aad = Buffer.from("AAD");
  const plaintext = Buffer.from("tampering-test");

  const { ciphertext, tag } = encrypt(key, nonce, plaintext, aad);

  // Baseline
  assert.notEqual(decrypt(key, nonce, ciphertext, tag, aad), null);

  // Tamper ciphertext
  const ctTampered = new Uint8Array(ciphertext);
  ctTampered[0] ^= 1;
  assert.equal(decrypt(key, nonce, ctTampered, tag, aad), null);

  // Tamper tag
  const tagTampered = new Uint8Array(tag);
  tagTampered[0] ^= 1;
  assert.equal(decrypt(key, nonce, ciphertext, tagTampered, aad), null);

  // Tamper AAD
  const aadTampered = Buffer.from("AAD-tampered");
  assert.equal(decrypt(key, nonce, ciphertext, tag, aadTampered), null);

  // Tamper nonce
  const nonceTampered = new Uint8Array(nonce);
  nonceTampered[0] ^= 1;
  assert.equal(decrypt(key, nonceTampered, ciphertext, tag, aad), null);
});

// ---------------------------------------------------------------------------
// Nonce reuse test (cross-tag mismatch must fail)
// ---------------------------------------------------------------------------

test("ChaCha20-Poly1305: nonce reuse → cross-tag mismatch", () => {
  const key = crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  const aad = Buffer.from("nonce-reuse-test");

  const pt1 = Buffer.from("message-1");
  const pt2 = Buffer.from("message-2");

  const e1 = encrypt(key, nonce, pt1, aad);
  const e2 = encrypt(key, nonce, pt2, aad);

  // Correct decrypts
  assert.equal(bytesToHex(decrypt(key, nonce, e1.ciphertext, e1.tag, aad)), pt1.toString("hex"));
  assert.equal(bytesToHex(decrypt(key, nonce, e2.ciphertext, e2.tag, aad)), pt2.toString("hex"));

  // Cross-tag must fail
  assert.equal(decrypt(key, nonce, e1.ciphertext, e2.tag, aad), null);
  assert.equal(decrypt(key, nonce, e2.ciphertext, e1.tag, aad), null);
});