// ============================================================================
// Authenticated X25519 + Ed25519 handshake
//
// Model:
//   - Each party has a long-term Ed25519 identity keypair (seed + pub).
//   - They exchange ephemeral X25519 public keys.
//   - Each party signs its own ephemeral X25519 public key with its Ed25519
//     identity private seed (32 bytes).
//   - The peer verifies the signature using the known Ed25519 identity public key.
//   - If verification succeeds on both sides, they derive a shared X25519 secret.
//   - The resulting sharedSecret can be used to build a SecureChannel.
//
// This module is transport-agnostic: it only defines the logical messages.
//
// File: lib/handshake.js
// ============================================================================

const crypto = require("crypto");
const { x25519, x25519Base } = require("./x25519.js");
const { ed25519Sign, ed25519Verify } = require("./ed25519.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toBytes(input) {
  if (input == null) return new Uint8Array(0);
  if (input instanceof Uint8Array) return input;
  if (Buffer.isBuffer(input)) return new Uint8Array(input);
  if (typeof input === "string") return new Uint8Array(Buffer.from(input, "utf8"));
  throw new Error("handshake: unsupported input type");
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// ---------------------------------------------------------------------------
// Handshake messages (logical)
//
// AliceHello:
//   - aliceEphemeralPub: Uint8Array(32)
//   - aliceSig: signature over LABEL || aliceEphemeralPub
//
// BobHello:
//   - bobEphemeralPub: Uint8Array(32)
//   - bobSig: signature over LABEL || bobEphemeralPub
//
// Both parties know each other's Ed25519 identity public keys:
//   - aliceIdentityPublicKey (Uint8Array(32))
//   - bobIdentityPublicKey   (Uint8Array(32))
//
// Identity private keys are 32-byte Ed25519 seeds.
// ---------------------------------------------------------------------------

const HANDSHAKE_LABEL = "NZ-CRYPTO-02/handshake/v1";

function buildTranscriptLabel() {
  return toBytes(HANDSHAKE_LABEL);
}

// ---------------------------------------------------------------------------
// Alice side: start handshake
// ---------------------------------------------------------------------------
function aliceStartHandshake(aliceIdentityPrivateSeed) {
  const aliceEphemeralSecret = crypto.randomBytes(32);
  const aliceEphemeralPub = x25519Base(aliceEphemeralSecret);

  const label = buildTranscriptLabel();
  const toSign = concatBytes(label, aliceEphemeralPub);

  // ed25519Sign(msg, seed32)
  const aliceSig = ed25519Sign(toSign, aliceIdentityPrivateSeed);

  return {
    aliceEphemeralSecret,
    aliceEphemeralPub,
    aliceSig: new Uint8Array(aliceSig),
  };
}

// ---------------------------------------------------------------------------
// Bob side: respond to AliceHello
// ---------------------------------------------------------------------------
function bobRespondHandshake(params) {
  const {
    aliceEphemeralPub,
    aliceSig,
    aliceIdentityPublicKey,
    bobIdentityPrivateSeed,
  } = params;

  const label = buildTranscriptLabel();
  const toVerify = concatBytes(label, aliceEphemeralPub);

  // ed25519Verify(msg, sig, pub)
  const ok = ed25519Verify(toVerify, aliceSig, aliceIdentityPublicKey);
  if (!ok) {
    return { ok: false, error: "Alice identity signature invalid" };
  }

  const bobEphemeralSecret = crypto.randomBytes(32);
  const bobEphemeralPub = x25519Base(bobEphemeralSecret);

  const toSignBob = concatBytes(label, bobEphemeralPub);
  const bobSig = ed25519Sign(toSignBob, bobIdentityPrivateSeed);

  const sharedSecretBob = x25519(bobEphemeralSecret, aliceEphemeralPub);

  return {
    ok: true,
    bobEphemeralSecret,
    bobEphemeralPub,
    bobSig: new Uint8Array(bobSig),
    sharedSecretBob,
  };
}

// ---------------------------------------------------------------------------
// Alice side: finish handshake after receiving BobHello
// ---------------------------------------------------------------------------
function aliceFinishHandshake(params) {
  const {
    aliceEphemeralSecret,
    bobEphemeralPub,
    bobSig,
    bobIdentityPublicKey,
  } = params;

  const label = buildTranscriptLabel();
  const toVerifyBob = concatBytes(label, bobEphemeralPub);

  const ok = ed25519Verify(toVerifyBob, bobSig, bobIdentityPublicKey);
  if (!ok) {
    return { ok: false, error: "Bob identity signature invalid" };
  }

  const sharedSecretAlice = x25519(aliceEphemeralSecret, bobEphemeralPub);

  return {
    ok: true,
    sharedSecretAlice,
  };
}

module.exports = {
  aliceStartHandshake,
  bobRespondHandshake,
  aliceFinishHandshake,
};