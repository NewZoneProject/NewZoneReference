// ============================================================================
// X25519 strict test suite (RFC 7748, Curve25519, Montgomery ladder)
// Run: node --test tests/x25519.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { x25519, x25519Base } from "../lib/x25519.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomBytes(n) {
  return new Uint8Array(crypto.randomBytes(n));
}

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

// ============================================================================
// 1. Basic KEX correctness
// ============================================================================

test("X25519: basic KEX (Alice/Bob shared secret equality)", () => {
  for (let i = 0; i < 50; i++) {
    const aSecret = randomBytes(32);
    const bSecret = randomBytes(32);

    const aPub = x25519Base(aSecret);
    const bPub = x25519Base(bSecret);

    const aShared = x25519(aSecret, bPub);
    const bShared = x25519(bSecret, aPub);

    assert.equal(bytesToHex(aShared), bytesToHex(bShared));
  }
});

// ============================================================================
// 2. Determinism tests
// ============================================================================

test("X25519: deterministic KEX", () => {
  for (let i = 0; i < 20; i++) {
    const aSecret = randomBytes(32);
    const bSecret = randomBytes(32);

    const aPub = x25519Base(aSecret);
    const bPub = x25519Base(bSecret);

    const s1 = x25519(aSecret, bPub);
    const s2 = x25519(aSecret, bPub);
    const s3 = x25519(bSecret, aPub);
    const s4 = x25519(bSecret, aPub);

    assert.equal(bytesToHex(s1), bytesToHex(s2));
    assert.equal(bytesToHex(s3), bytesToHex(s4));
    assert.equal(bytesToHex(s1), bytesToHex(s3));
  }
});

// ============================================================================
// 3. Tampering tests
// ============================================================================

test("X25519: tampering behavior", () => {
  const aSecret = randomBytes(32);
  const bSecret = randomBytes(32);

  const aPub = x25519Base(aSecret);
  const bPub = x25519Base(bSecret);

  const sharedAB = x25519(aSecret, bPub);
  const sharedBA = x25519(bSecret, aPub);

  assert.equal(bytesToHex(sharedAB), bytesToHex(sharedBA));

  // Tamper Bob pub
  const bPubTampered = new Uint8Array(bPub);
  bPubTampered[0] ^= 1;
  assert.notEqual(
    bytesToHex(x25519(aSecret, bPubTampered)),
    bytesToHex(sharedAB)
  );

  // Tamper Alice pub
  const aPubTampered = new Uint8Array(aPub);
  aPubTampered[0] ^= 1;
  assert.notEqual(
    bytesToHex(x25519(bSecret, aPubTampered)),
    bytesToHex(sharedBA)
  );

  // Tamper Alice secret → still 32 bytes
  const aSecretTampered = new Uint8Array(aSecret);
  aSecretTampered[0] ^= 1;
  assert.equal(x25519(aSecretTampered, bPub).length, 32);

  // Tamper Bob secret → still 32 bytes
  const bSecretTampered = new Uint8Array(bSecret);
  bSecretTampered[0] ^= 1;
  assert.equal(x25519(bSecretTampered, aPub).length, 32);
});

// ============================================================================
// 4. Cross-check with node:crypto
// ============================================================================

test("X25519: cross-check with node:crypto", () => {
  for (let i = 0; i < 20; i++) {
    const aSecret = randomBytes(32);
    const bSecret = randomBytes(32);

    const aPub = x25519Base(aSecret);
    const bPub = x25519Base(bSecret);
    const sharedAB = x25519(aSecret, bPub);
    const sharedBA = x25519(bSecret, aPub);

    // Node private keys (PKCS#8)
    const aKey = crypto.createPrivateKey({
      key: Buffer.concat([
        Buffer.from("302e020100300506032b656e04220420", "hex"),
        Buffer.from(aSecret),
      ]),
      format: "der",
      type: "pkcs8",
    });

    const bKey = crypto.createPrivateKey({
      key: Buffer.concat([
        Buffer.from("302e020100300506032b656e04220420", "hex"),
        Buffer.from(bSecret),
      ]),
      format: "der",
      type: "pkcs8",
    });

    const aPubNode = crypto
      .createPublicKey(aKey)
      .export({ type: "spki", format: "der" })
      .subarray(-32);

    const bPubNode = crypto
      .createPublicKey(bKey)
      .export({ type: "spki", format: "der" })
      .subarray(-32);

    assert.equal(bytesToHex(aPub), bytesToHex(aPubNode));
    assert.equal(bytesToHex(bPub), bytesToHex(bPubNode));

    const sharedNodeAB = crypto.diffieHellman({
      privateKey: aKey,
      publicKey: crypto.createPublicKey({
        key: Buffer.concat([
          Buffer.from("302a300506032b656e032100", "hex"),
          bPubNode,
        ]),
        format: "der",
        type: "spki",
      }),
    });

    const sharedNodeBA = crypto.diffieHellman({
      privateKey: bKey,
      publicKey: crypto.createPublicKey({
        key: Buffer.concat([
          Buffer.from("302a300506032b656e032100", "hex"),
          aPubNode,
        ]),
        format: "der",
        type: "spki",
      }),
    });

    assert.equal(bytesToHex(sharedAB), bytesToHex(sharedNodeAB));
    assert.equal(bytesToHex(sharedBA), bytesToHex(sharedNodeBA));
  }
});

// ============================================================================
// 5. RFC 7748 test vectors
// ============================================================================

test("X25519: RFC 7748 test vectors", () => {
  // Vector 1
  const k1 = hexToBytes(
    "a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4"
  );
  const u1 = hexToBytes(
    "e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c"
  );
  const out1 = bytesToHex(x25519(k1, u1));
  assert.equal(
    out1,
    "c3da55379de9c6908e94ea4df28d084f32eccf03491c71f754b4075577a28552"
  );

  // Vector 2
  const k2 = hexToBytes(
    "4b66e9d4d1b4673c5ad22691957d6af5c11b6421e0ea01d42ca4169e7918ba0d"
  );
  const u2 = hexToBytes(
    "e5210f12786811d3f4b7959d0538ae2c31dbe7106fc03c3efc4cd549c715a493"
  );
  const out2 = bytesToHex(x25519(k2, u2));
  assert.equal(
    out2,
    "95cbde9476e8907d7aade45cb4b873f88b595a68799fa152e6f8f7647aac7957"
  );
});

// ============================================================================
// 6. RFC-compatible iterative test (1 and 1000 iterations)
// ============================================================================

test("X25519: iterative test (1 and 1000 iterations)", () => {
  let k = hexToBytes(
    "0900000000000000000000000000000000000000000000000000000000000000"
  );
  let u = k.slice();

  function step() {
    const r = x25519(k, u);
    u = k;
    k = r;
  }

  // 1 iteration
  step();
  assert.equal(
    bytesToHex(k),
    "422c8e7a6227d7bca1350b3e2bb7279f7897b87bb6854b783c60e80311ae3079"
  );

  // 1000 iterations
  for (let i = 1; i < 1000; i++) step();

  assert.equal(
    bytesToHex(k),
    "684cf59ba83309552800ef566f2f4d3c1c3887c49360e3875f2eb94d99532c51"
  );
});

// ============================================================================
// 7. Diffie–Hellman symmetry test (fixed scalars)
// ============================================================================

test("X25519: DH symmetry (fixed scalars)", () => {
  const a = hexToBytes(
    "0f00000000000000000000000000000000000000000000000000000000000000"
  );
  const b = hexToBytes(
    "f000000000000000000000000000000000000000000000000000000000000000"
  );

  const A = x25519Base(a);
  const B = x25519Base(b);

  const K1 = bytesToHex(x25519(a, B));
  const K2 = bytesToHex(x25519(b, A));

  assert.equal(K1, K2);
});