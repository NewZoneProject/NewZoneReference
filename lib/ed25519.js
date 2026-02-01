// ============================================================================
// Ed25519 (node:crypto)
// Production-ready implementation with support for:
//   • Ed25519 (standard mode)
//   • Ed25519ctx (context-bound signatures)
//   • Ed25519ph (pre-hashed signatures)
// This module provides a stable, RFC 8032–compatible API for NewZone.
// ============================================================================

const crypto = require("crypto");

// ============================================================================
// Block 1 — SHA-512 (reference wrapper)
// ============================================================================
function sha512(message) {
  const m = message instanceof Uint8Array ? message : new Uint8Array(message);
  return new Uint8Array(
    crypto.createHash("sha512").update(m).digest()
  );
}

// ============================================================================
// Block 2 — Ed25519 key generation, signing, verification (via node:crypto)
// ============================================================================

// seed: 32-byte Uint8Array / Buffer
function ed25519GetPublicKey(seed) {
  const s = Buffer.from(seed);
  if (s.length !== 32) {
    throw new Error("Ed25519 seed must be 32 bytes");
  }

  // PKCS#8 private key structure for Ed25519
  const pkcs8 = Buffer.concat([
    Buffer.from("302e020100300506032b657004220420", "hex"),
    s,
  ]);

  const privKey = crypto.createPrivateKey({
    key: pkcs8,
    format: "der",
    type: "pkcs8",
  });

  const pubDer = crypto.createPublicKey(privKey).export({
    type: "spki",
    format: "der",
  });

  // Last 32 bytes contain the raw Ed25519 public key
  return new Uint8Array(pubDer.subarray(pubDer.length - 32));
}

// msg: Uint8Array/Buffer/string, seed: 32-byte
function ed25519Sign(msg, seed) {
  const s = Buffer.from(seed);
  if (s.length !== 32) {
    throw new Error("Ed25519 seed must be 32 bytes");
  }

  const pkcs8 = Buffer.concat([
    Buffer.from("302e020100300506032b657004220420", "hex"),
    s,
  ]);

  const privKey = crypto.createPrivateKey({
    key: pkcs8,
    format: "der",
    type: "pkcs8",
  });

  const m = Buffer.isBuffer(msg) ? msg : Buffer.from(msg);
  const sig = crypto.sign(null, m, privKey);
  return new Uint8Array(sig);
}

// msg: Uint8Array/Buffer/string, sig: 64-byte, pub: 32-byte
function ed25519Verify(msg, sig, pub) {
  const p = Buffer.from(pub);
  const s = Buffer.from(sig);

  if (p.length !== 32) return false;
  if (s.length !== 64) return false;

  const spki = Buffer.concat([
    Buffer.from("302a300506032b6570032100", "hex"),
    p,
  ]);

  const pubKey = crypto.createPublicKey({
    key: spki,
    format: "der",
    type: "spki",
  });

  const m = Buffer.isBuffer(msg) ? msg : Buffer.from(msg);
  return crypto.verify(null, m, pubKey, s);
}

// ============================================================================
// Block 3 — Ed25519ctx / Ed25519ph (RFC 8032)
// ============================================================================

// RFC 8032 domain separator construction
function dom2(prefixFlag, context) {
  const ctx = context ? Buffer.from(context) : Buffer.alloc(0);
  if (ctx.length > 255) {
    throw new Error("Ed25519ctx: context must be ≤ 255 bytes");
  }

  // "SigEd25519 no Ed25519 collisions"
  const domPrefix = Buffer.from(
    "53696745643235353139206e6f204564323535313920636f6c6c6973696f6e73",
    "hex"
  );

  return new Uint8Array(
    Buffer.concat([
      domPrefix,
      Buffer.from([prefixFlag]),
      Buffer.from([ctx.length]),
      ctx,
    ])
  );
}

// ---------------------------------------------------------------------------
// Ed25519ctx — Context-bound signatures
// ---------------------------------------------------------------------------
function ed25519SignCtx(msg, seed, context) {
  const dom = dom2(0x01, context);
  const fullMsg = Buffer.concat([Buffer.from(dom), Buffer.from(msg)]);
  return ed25519Sign(fullMsg, seed);
}

function ed25519VerifyCtx(pub, msg, sig, context) {
  const dom = dom2(0x01, context);
  const fullMsg = Buffer.concat([Buffer.from(dom), Buffer.from(msg)]);
  return ed25519Verify(fullMsg, sig, pub);
}

// ---------------------------------------------------------------------------
// Ed25519ph — Pre-hashed signatures
// ---------------------------------------------------------------------------
function ed25519SignPh(prehashedMsg, seed, context) {
  if (!(prehashedMsg instanceof Uint8Array) || prehashedMsg.length !== 64) {
    throw new Error("Ed25519ph: pre-hashed message must be 64 bytes");
  }

  const dom = dom2(0x02, context);
  const fullMsg = Buffer.concat([Buffer.from(dom), Buffer.from(prehashedMsg)]);
  return ed25519Sign(fullMsg, seed);
}

function ed25519VerifyPh(pub, prehashedMsg, sig, context) {
  if (!(prehashedMsg instanceof Uint8Array) || prehashedMsg.length !== 64) {
    throw new Error("Ed25519ph: pre-hashed message must be 64 bytes");
  }

  const dom = dom2(0x02, context);
  const fullMsg = Buffer.concat([Buffer.from(dom), Buffer.from(prehashedMsg)]);
  return ed25519Verify(fullMsg, sig, pub);
}

// ============================================================================
// Public API (NewZone-facing)
// ============================================================================

function getPublicKey(seed) {
  return ed25519GetPublicKey(seed);
}

function sign(seed, msg) {
  return ed25519Sign(msg, seed);
}

function verify(pub, msg, sig) {
  return ed25519Verify(msg, sig, pub);
}

module.exports = {
  // Hash
  sha512,

  // Canonical Ed25519 API
  ed25519GetPublicKey,
  ed25519Sign,
  ed25519Verify,

  // Aliases
  getPublicKey,
  sign,
  verify,

  // Extended RFC 8032 modes
  ed25519SignCtx,
  ed25519VerifyCtx,
  ed25519SignPh,
  ed25519VerifyPh,
};