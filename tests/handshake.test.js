// ============================================================================
// handshake.test.js — tests for authenticated X25519 + Ed25519 handshake
// NewZone Reference Implementation
//
// Run: node --test tests/handshake.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert";

import { aliceStartHandshake, bobRespondHandshake, aliceFinishHandshake } from "../lib/handshake.js";
import { ed25519GetPublicKey } from "../lib/ed25519.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hex(u8) {
  return Buffer.from(u8).toString("hex");
}

function randomSeed32() {
  const out = new Uint8Array(32);
  crypto.getRandomValues(out);
  return out;
}

// ---------------------------------------------------------------------------
// Test 1 — Basic handshake flow
// ---------------------------------------------------------------------------

test("authenticated handshake: valid flow", () => {
  // Identity seeds (Ed25519)
  const aliceSeed = randomSeed32();
  const bobSeed = randomSeed32();

  const alicePub = ed25519GetPublicKey(aliceSeed);
  const bobPub = ed25519GetPublicKey(bobSeed);

  // Alice → Bob
  const aliceHello = aliceStartHandshake(aliceSeed);

  assert.equal(aliceHello.aliceEphemeralPub.length, 32);
  assert.equal(aliceHello.aliceSig.length, 64);

  // Bob → Alice
  const bobResp = bobRespondHandshake({
    aliceEphemeralPub: aliceHello.aliceEphemeralPub,
    aliceSig: aliceHello.aliceSig,
    aliceIdentityPublicKey: alicePub,
    bobIdentityPrivateSeed: bobSeed,
  });

  assert.equal(bobResp.ok, true);
  assert.equal(bobResp.bobEphemeralPub.length, 32);
  assert.equal(bobResp.bobSig.length, 64);
  assert.equal(bobResp.sharedSecretBob.length, 32);

  // Alice final
  const aliceFin = aliceFinishHandshake({
    aliceEphemeralSecret: aliceHello.aliceEphemeralSecret,
    bobEphemeralPub: bobResp.bobEphemeralPub,
    bobSig: bobResp.bobSig,
    bobIdentityPublicKey: bobPub,
  });

  assert.equal(aliceFin.ok, true);
  assert.equal(aliceFin.sharedSecretAlice.length, 32);

  // Shared secrets must match
  assert.equal(hex(aliceFin.sharedSecretAlice), hex(bobResp.sharedSecretBob));
});

// ---------------------------------------------------------------------------
// Test 2 — Invalid Alice signature
// ---------------------------------------------------------------------------

test("authenticated handshake: invalid Alice signature", () => {
  const aliceSeed = randomSeed32();
  const bobSeed = randomSeed32();

  const alicePub = ed25519GetPublicKey(aliceSeed);

  const aliceHello = aliceStartHandshake(aliceSeed);

  // Corrupt Alice signature
  const badSig = new Uint8Array(aliceHello.aliceSig);
  badSig[0] ^= 0xff;

  const bobResp = bobRespondHandshake({
    aliceEphemeralPub: aliceHello.aliceEphemeralPub,
    aliceSig: badSig,
    aliceIdentityPublicKey: alicePub,
    bobIdentityPrivateSeed: bobSeed,
  });

  assert.equal(bobResp.ok, false);
  assert.match(bobResp.error, /Alice identity signature invalid/);
});

// ---------------------------------------------------------------------------
// Test 3 — Invalid Bob signature
// ---------------------------------------------------------------------------

test("authenticated handshake: invalid Bob signature", () => {
  const aliceSeed = randomSeed32();
  const bobSeed = randomSeed32();

  const alicePub = ed25519GetPublicKey(aliceSeed);
  const bobPub = ed25519GetPublicKey(bobSeed);

  const aliceHello = aliceStartHandshake(aliceSeed);

  const bobResp = bobRespondHandshake({
    aliceEphemeralPub: aliceHello.aliceEphemeralPub,
    aliceSig: aliceHello.aliceSig,
    aliceIdentityPublicKey: alicePub,
    bobIdentityPrivateSeed: bobSeed,
  });

  assert.equal(bobResp.ok, true);

  // Corrupt Bob signature
  const badBobSig = new Uint8Array(bobResp.bobSig);
  badBobSig[0] ^= 0xff;

  const aliceFin = aliceFinishHandshake({
    aliceEphemeralSecret: aliceHello.aliceEphemeralSecret,
    bobEphemeralPub: bobResp.bobEphemeralPub,
    bobSig: badBobSig,
    bobIdentityPublicKey: bobPub,
  });

  assert.equal(aliceFin.ok, false);
  assert.match(aliceFin.error, /Bob identity signature invalid/);
});