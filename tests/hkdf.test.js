// ============================================================================
// HKDF strict test suite (RFC 5869-style, HMAC-SHA-512, HMAC-BLAKE2b)
// Run: node --test tests/hkdf.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { hkdfExtract, hkdfExpand, hkdf } from "../lib/hkdf.js";

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
// HKDF-SHA-512 vs node:crypto.hkdfSync
// ---------------------------------------------------------------------------

test("HKDF-SHA-512: match node:crypto.hkdfSync", () => {
  const cases = [
    {
      ikm: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
      salt: "000102030405060708090a0b0c",
      info: "f0f1f2f3f4f5f6f7f8f9",
      length: 42,
    },
    {
      ikm:
        "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f" +
        "202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f" +
        "404142434445464748494a4b4c4d4e4f",
      salt:
        "606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f" +
        "808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f" +
        "a0a1a2a3a4a5a6a7a8a9aaabacadaeaf",
      info:
        "b0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecf" +
        "d0d1d2d3d4d5d6d7d8d9dadbdcdddedf" +
        "e0e1e2e3e4e5e6e7e8e9eaebecedeeef" +
        "f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff",
      length: 82,
    },
    {
      ikm: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
      salt: "",
      info: "",
      length: 42,
    },
  ];

  for (const c of cases) {
    const ikm = hexToBytes(c.ikm);
    const salt = c.salt ? hexToBytes(c.salt) : new Uint8Array(0);
    const info = c.info ? hexToBytes(c.info) : new Uint8Array(0);

    const ours = hkdf("sha512", salt, ikm, info, c.length);
    const oursHex = bytesToHex(ours);

    const node = crypto.hkdfSync(
      "sha512",
      Buffer.from(ikm),
      Buffer.from(salt),
      Buffer.from(info),
      c.length
    );
    const nodeHex = Buffer.from(node).toString("hex");

    assert.equal(oursHex, nodeHex);
  }
});

// ---------------------------------------------------------------------------
// HKDF-BLAKE2b basic tests (determinism, separation)
// ---------------------------------------------------------------------------

test("HKDF-BLAKE2b: determinism and context separation", () => {
  const ikm = Buffer.from("NewZone-HKDF-BLAKE2b-IKM");
  const salt = Buffer.from("NewZone-HKDF-BLAKE2b-salt");
  const info1 = Buffer.from("context-1");
  const info2 = Buffer.from("context-2");

  const okm1a = hkdf("blake2b", salt, ikm, info1, 32);
  const okm1b = hkdf("blake2b", salt, ikm, info1, 32);
  const okm2 = hkdf("blake2b", salt, ikm, info2, 32);

  assert.equal(bytesToHex(okm1a), bytesToHex(okm1b));
  assert.notEqual(bytesToHex(okm1a), bytesToHex(okm2));
});

// ---------------------------------------------------------------------------
// HKDF length and segment tests
// ---------------------------------------------------------------------------

test("HKDF: output lengths and segment consistency", () => {
  const ikm = Buffer.from("length-and-segment-test");
  const salt = Buffer.from("salt");
  const info = Buffer.from("info");

  for (const hash of ["sha512", "blake2b"]) {
    for (const len of [1, 16, 32, 64, 100, 255, 512]) {
      const okm = hkdf(hash, salt, ikm, info, len);
      assert.equal(okm.length, len);
    }

    const okm32 = hkdf(hash, salt, ikm, info, 32);
    const okm64 = hkdf(hash, salt, ikm, info, 64);

    assert.equal(
      bytesToHex(okm32),
      bytesToHex(okm64.subarray(0, 32))
    );
  }
});

// ---------------------------------------------------------------------------
// Tampering tests (salt / info / ikm)
// ---------------------------------------------------------------------------

test("HKDF: tampering changes output", () => {
  const ikm = Buffer.from("ikm-base");
  const salt = Buffer.from("salt-base");
  const info = Buffer.from("info-base");

  const base = bytesToHex(hkdf("sha512", salt, ikm, info, 32));

  const salt2 = Buffer.from("salt-base-2");
  const info2 = Buffer.from("info-base-2");
  const ikm2 = Buffer.from("ikm-base-2");

  assert.notEqual(base, bytesToHex(hkdf("sha512", salt2, ikm, info, 32)));
  assert.notEqual(base, bytesToHex(hkdf("sha512", salt, ikm, info2, 32)));
  assert.notEqual(base, bytesToHex(hkdf("sha512", salt, ikm2, info, 32)));
});