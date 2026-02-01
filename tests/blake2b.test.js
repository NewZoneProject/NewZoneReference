// ============================================================================
// BLAKE2b strict test suite (RFC 7693, 64-bit, node:crypto-backed)
// Run: node --test tests/blake2b.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { blake2b } from "../lib/blake2b.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hexToBytes(hex) {
  hex = hex.replace(/\s/g, "").toLowerCase();
  if (hex.length % 2 !== 0) hex = "0" + hex;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// RFC 7693 test vectors (unkeyed, BLAKE2b-512)
// ---------------------------------------------------------------------------

test("BLAKE2b RFC 7693 vector: empty", () => {
  const out = bytesToHex(blake2b("", 64));
  const expected =
    "786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419" +
    "d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce";
  assert.equal(out, expected);
});

test("BLAKE2b RFC 7693 vector: 'abc'", () => {
  const out = bytesToHex(blake2b("abc", 64));
  const expected =
    "ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d1" +
    "7d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923";
  assert.equal(out, expected);
});

// ---------------------------------------------------------------------------
// Cross-check with node:crypto "blake2b512"
// ---------------------------------------------------------------------------

test("BLAKE2b cross-check with node:crypto", () => {
  const inputs = [
    "",
    "a",
    "abc",
    "The quick brown fox jumps over the lazy dog",
    "NewZone / NZ-CRYPTO-02 / BLAKE2b",
  ];

  for (const msg of inputs) {
    const ours = bytesToHex(blake2b(msg, 64));

    const h = crypto.createHash("blake2b512");
    h.update(Buffer.from(msg, "utf8"));
    const node = h.digest("hex");

    assert.equal(ours, node, `Mismatch for input: "${msg}"`);
  }
});

// ---------------------------------------------------------------------------
// Output length tests (1..64 bytes)
// ---------------------------------------------------------------------------

test("BLAKE2b output length range 1..64", () => {
  const msg = "length-test";

  for (let len = 1; len <= 64; len++) {
    const out = blake2b(msg, len);
    assert.equal(out.length, len, `Invalid output length: ${len}`);
  }
});

// ---------------------------------------------------------------------------
// Keyed BLAKE2b tests
// ---------------------------------------------------------------------------

test("BLAKE2b keyed mode vs node:crypto", () => {
  const msg = "keyed-blake2b-test";
  const key = hexToBytes("000102030405060708090a0b0c0d0e0f");

  const ours = bytesToHex(blake2b(msg, 64, key));

  const h = crypto.createHash("blake2b512", { key: Buffer.from(key) });
  h.update(Buffer.from(msg, "utf8"));
  const node = h.digest("hex");

  assert.equal(ours, node);
});