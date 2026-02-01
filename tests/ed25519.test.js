// ============================================================================
// Ed25519 strict test suite (RFC 8032, Edwards25519, SHA-512, node:crypto)
// Run: node --test tests/ed25519.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import * as ed from "../lib/ed25519.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hexToBytes(hex) {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

function bytesToHex(b) {
  return Buffer.from(b).toString("hex");
}

function randomBytes(n) {
  return new Uint8Array(crypto.randomBytes(n));
}

// ---------------------------------------------------------------------------
// RFC 8032 Test Vectors (Ed25519)
// ---------------------------------------------------------------------------

test("Ed25519: RFC 8032 test vectors", () => {
  const vectors = [
    {
      seed: "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60",
      pub:  "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a",
      msg:  "",
      sig:  "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155" +
            "5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b",
    },
    {
      seed: "4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb",
      pub:  "3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c",
      msg:  "72",
      sig:  "92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da" +
            "085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00",
    },
  ];

  for (const v of vectors) {
    const seed = hexToBytes(v.seed);
    const pub  = hexToBytes(v.pub);
    const msg  = hexToBytes(v.msg);
    const sig  = hexToBytes(v.sig);

    const ourPub = ed.getPublicKey(seed);
    assert.equal(bytesToHex(ourPub), v.pub);

    const ourSig = ed.sign(seed, msg);
    assert.equal(bytesToHex(ourSig), v.sig);

    assert.equal(ed.verify(pub, msg, sig), true);
  }
});

// ---------------------------------------------------------------------------
// Random roundtrip tests
// ---------------------------------------------------------------------------

test("Ed25519: random roundtrip (50 cases)", () => {
  for (let i = 0; i < 50; i++) {
    const seed = randomBytes(32);
    const msg  = randomBytes(128);

    const pub = ed.getPublicKey(seed);
    const sig = ed.sign(seed, msg);

    assert.equal(pub.length, 32);
    assert.equal(sig.length, 64);
    assert.equal(ed.verify(pub, msg, sig), true);
  }
});

// ---------------------------------------------------------------------------
// Cross-check with node:crypto
// ---------------------------------------------------------------------------

test("Ed25519: cross-check with node:crypto", () => {
  for (let i = 0; i < 20; i++) {
    const seed = randomBytes(32);
    const msg  = randomBytes(64);

    const ourPub = ed.getPublicKey(seed);

    const pkcs8 = Buffer.concat([
      Buffer.from("302e020100300506032b657004220420", "hex"),
      Buffer.from(seed),
    ]);

    const priv = crypto.createPrivateKey({
      key: pkcs8,
      format: "der",
      type: "pkcs8",
    });

    const nodePub = crypto.createPublicKey(priv)
      .export({ type: "spki", format: "der" })
      .subarray(-32);

    assert.equal(bytesToHex(ourPub), bytesToHex(nodePub));

    const ourSig  = ed.sign(seed, msg);
    const nodeSig = crypto.sign(null, Buffer.from(msg), priv);

    assert.equal(bytesToHex(ourSig), bytesToHex(nodeSig));
    assert.equal(ed.verify(ourPub, msg, ourSig), true);
  }
});

// ---------------------------------------------------------------------------
// Ed25519ctx tests
// ---------------------------------------------------------------------------

test("Ed25519ctx: context-bound signatures", () => {
  for (let i = 0; i < 20; i++) {
    const seed = randomBytes(32);
    const msg  = randomBytes(64);
    const ctx  = randomBytes(8);

    const pub = ed.getPublicKey(seed);
    const sig = ed.ed25519SignCtx(msg, seed, ctx);

    assert.equal(sig.length, 64);
    assert.equal(ed.ed25519VerifyCtx(pub, msg, sig, ctx), true);

    const wrongCtx = randomBytes(8);
    assert.equal(ed.ed25519VerifyCtx(pub, msg, sig, wrongCtx), false);
  }
});

// ---------------------------------------------------------------------------
// Ed25519ph tests
// ---------------------------------------------------------------------------

test("Ed25519ph: pre-hashed signatures", () => {
  for (let i = 0; i < 20; i++) {
    const seed = randomBytes(32);
    const msg  = randomBytes(200);

    const pre = ed.sha512(msg);
    const pub = ed.getPublicKey(seed);

    const sig = ed.ed25519SignPh(pre, seed);

    assert.equal(sig.length, 64);
    assert.equal(ed.ed25519VerifyPh(pub, pre, sig), true);

    const wrongPre = ed.sha512(randomBytes(200));
    assert.equal(ed.ed25519VerifyPh(pub, wrongPre, sig), false);
  }
});

// ---------------------------------------------------------------------------
// Tampering tests
// ---------------------------------------------------------------------------

test("Ed25519: tampering detection", () => {
  const seed = randomBytes(32);
  const msg  = randomBytes(32);
  const pub  = ed.getPublicKey(seed);
  const sig  = ed.sign(seed, msg);

  const badSig = new Uint8Array(sig);
  badSig[0] ^= 1;
  assert.equal(ed.verify(pub, msg, badSig), false);

  const badMsg = new Uint8Array(msg);
  badMsg[0] ^= 1;
  assert.equal(ed.verify(pub, badMsg, sig), false);

  const badPub = new Uint8Array(pub);
  badPub[0] ^= 1;
  assert.equal(ed.verify(badPub, msg, sig), false);
});

// ---------------------------------------------------------------------------
// API robustness tests
// ---------------------------------------------------------------------------

test("Ed25519: API robustness", () => {
  const seed = randomBytes(32);
  const msg  = randomBytes(16);
  const pub  = ed.getPublicKey(seed);
  const sig  = ed.sign(seed, msg);

  assert.equal(ed.verify(Buffer.from(pub), Buffer.from(msg), Buffer.from(sig)), true);
  assert.equal(ed.verify(pub, msg, sig), true);
  assert.equal(ed.verify(pub, Buffer.from(msg), sig), true);

  const msgStr = "hello world";
  const seed2  = randomBytes(32);
  const pub2   = ed.getPublicKey(seed2);
  const sig2   = ed.sign(seed2, msgStr);

  assert.equal(ed.verify(pub2, msgStr, sig2), true);
});

// ---------------------------------------------------------------------------
// Determinism test
// ---------------------------------------------------------------------------

test("Ed25519: deterministic signatures", () => {
  const seed = randomBytes(32);
  const msg  = randomBytes(64);

  const sig1 = ed.sign(seed, msg);
  const sig2 = ed.sign(seed, msg);

  assert.equal(bytesToHex(sig1), bytesToHex(sig2));
});