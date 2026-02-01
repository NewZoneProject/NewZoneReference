// ============================================================================
// NZ-CRYPTO-01 — unified cryptographic facade for NewZone
//
// This module wires together the reference implementations from ./lib and
// exposes a clean, minimal API for higher-level services and protocols.
//
// It provides:
//   - Utility helpers (hashing, canonicalization, base64)
//   - Seed derivation (NZ-CRYPTO-SEED-01)
//   - Ed25519 / X25519 access (generate/import/sign/verify)
//   - HKDF and ChaCha20-Poly1305 AEAD
//   - Session key derivation
//   - Authenticated handshake
//   - SecureChannel abstraction
//   - High-level packet signing and encryption helpers
//
// File: lib/nz-crypto.js
// ============================================================================

const crypto = require("crypto");

const {
  deriveMasterSecret,
  deriveSeedKey,
  deriveSeedKeyFromMnemonic,
} = require("./nz-crypto-seed.js");

const {
  ed25519GetPublicKey,
  ed25519Sign,
  ed25519Verify,
} = require("./ed25519.js");

const { x25519, x25519Base } = require("./x25519.js");
const { hkdf } = require("./hkdf.js");
const {
  encrypt: aeadEncrypt,
  decrypt: aeadDecrypt,
} = require("./chacha20poly1305.js");

const { deriveSessionKeys } = require("./sessionKeys.js");
const {
  aliceStartHandshake,
  bobRespondHandshake,
  aliceFinishHandshake,
} = require("./handshake.js");

const { SecureChannel } = require("./secureChannel.js");
const { blake2b } = require("./blake2b.js");

const te = new TextEncoder();
const td = new TextDecoder();

// ============================================================================
// Utility helpers
// ============================================================================

function sha256(bytes) {
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(bytes));
  return new Uint8Array(hash.digest());
}

function sha256Hex(obj) {
  const json = typeof obj === "string" ? obj : JSON.stringify(obj);
  const data = te.encode(json);
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(data));
  return hash.digest("hex");
}

function canonicalize(obj) {
  const keys = Object.keys(obj).sort();
  const res = {};
  for (const k of keys) {
    if (obj[k] !== undefined) res[k] = obj[k];
  }
  return res;
}

function u8ToB64(u8) {
  return Buffer.from(u8).toString("base64");
}

function b64ToU8(b64) {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

// ============================================================================
// Ed25519 facade
// ============================================================================

function ed25519_importPrivateKey(seed32) {
  if (!(seed32 instanceof Uint8Array) || seed32.length !== 32) {
    throw new Error("Ed25519 private key must be 32 bytes");
  }
  const privateKey = new Uint8Array(seed32);
  const publicKey = ed25519GetPublicKey(privateKey);
  return { publicKey, privateKey };
}

function ed25519_importPublicKey(pub32) {
  if (!(pub32 instanceof Uint8Array) || pub32.length !== 32) {
    throw new Error("Ed25519 public key must be 32 bytes");
  }
  return new Uint8Array(pub32);
}

function ed25519_generateKeyPair() {
  const seed = crypto.randomBytes(32);
  return ed25519_importPrivateKey(seed);
}

// ============================================================================
// X25519 facade
// ============================================================================

function x25519_importPrivateKey(seed32) {
  if (!(seed32 instanceof Uint8Array) || seed32.length !== 32) {
    throw new Error("X25519 private key must be 32 bytes");
  }
  const privateKey = new Uint8Array(seed32);
  const publicKey = x25519Base(privateKey);
  return { publicKey, privateKey };
}

function x25519_importPublicKey(pub32) {
  if (!(pub32 instanceof Uint8Array) || pub32.length !== 32) {
    throw new Error("X25519 public key must be 32 bytes");
  }
  return new Uint8Array(pub32);
}

function x25519_generateKeyPair() {
  const seed = crypto.randomBytes(32);
  return x25519_importPrivateKey(seed);
}

// ============================================================================
// High-level packet signing (Ed25519)
// ============================================================================

async function buildSignedPacket({ nodeId, privateKey, body }) {
  const bodyHash = sha256Hex(body);

  const auth = {
    node_id: nodeId,
    timestamp: Math.floor(Date.now() / 1000),
    nonce: crypto.randomBytes(16).toString("hex"),
    body_hash: bodyHash,
  };

  const canonicalAuth = canonicalize(auth);
  const authHashHex = sha256Hex(canonicalAuth);
  const msgBytes = te.encode(authHashHex);

  const sigBytes = ed25519Sign(msgBytes, privateKey);
  const signature = u8ToB64(sigBytes);

  return {
    auth: { ...auth, signature },
    body,
  };
}

async function verifySignedPacket({
  packet,
  getPublicKeyByNodeId,
  maxSkewSec = 300,
  isNonceSeen,
}) {
  const { auth, body } = packet || {};
  if (!auth || !body) return { ok: false, reason: "missing_auth_or_body" };

  const { node_id, timestamp, nonce, body_hash, signature } = auth;
  if (!node_id || !timestamp || !nonce || !body_hash || !signature) {
    return { ok: false, reason: "missing_auth_fields" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > maxSkewSec) {
    return { ok: false, reason: "timestamp_out_of_range" };
  }

  if (isNonceSeen) {
    const replay = await isNonceSeen(node_id, nonce);
    if (replay) return { ok: false, reason: "replay_nonce" };
  }

  const realBodyHash = sha256Hex(body);
  if (realBodyHash !== body_hash) {
    return { ok: false, reason: "body_hash_mismatch" };
  }

  const { signature: _, ...authWithoutSig } = auth;
  const canonicalAuth = canonicalize(authWithoutSig);
  const authHashHex = sha256Hex(canonicalAuth);
  const msgBytes = te.encode(authHashHex);

  const pubKey = await getPublicKeyByNodeId(node_id);
  if (!pubKey) return { ok: false, reason: "unknown_node" };

  const sigBytes = b64ToU8(signature);
  const ok = ed25519Verify(msgBytes, sigBytes, pubKey);
  if (!ok) return { ok: false, reason: "invalid_signature" };

  return { ok: true, node_id };
}

// ============================================================================
// Session key derivation (X25519 + HKDF)
// ============================================================================

function deriveSessionKey({
  ourPrivX25519,
  theirPubX25519,
  context = "NZ-CRYPTO-01/session",
  hash = "sha512",
  keyLength = 32,
}) {
  const sharedSecret = x25519(ourPrivX25519, theirPubX25519);

  const ctxBytes = te.encode(context);
  const salt = blake2b(ctxBytes, 32);
  const info = te.encode("NZ-CRYPTO-01/deriveSessionKey");

  return hkdf(hash, salt, sharedSecret, info, keyLength);
}

// ============================================================================
// Packet encryption / decryption (ChaCha20-Poly1305)
// ============================================================================

function encryptPacket({
  packet,
  sessionKey,
  senderNodeId,
  receiverNodeId,
  baseContext = "NZ-CRYPTO-01/packet",
}) {
  const json = JSON.stringify(packet);
  const plaintext = te.encode(json);

  const nonce = crypto.randomBytes(12);
  const aad = te.encode(`${senderNodeId}->${receiverNodeId}`);

  const { ciphertext, tag } = aeadEncrypt(sessionKey, nonce, plaintext, aad);

  return {
    version: "nz-crypto-01",
    cipher: "chacha20-poly1305",
    sender_node_id: senderNodeId,
    receiver_node_id: receiverNodeId,
    nonce: u8ToB64(nonce),
    tag: u8ToB64(tag),
    ciphertext: u8ToB64(ciphertext),
    context: baseContext,
  };
}

function decryptPacket({ packet, sessionKey }) {
  if (packet.version !== "nz-crypto-01") {
    throw new Error(`Unsupported crypto version: ${packet.version}`);
  }
  if (packet.cipher !== "chacha20-poly1305") {
    throw new Error(`Unsupported cipher: ${packet.cipher}`);
  }

  const nonce = b64ToU8(packet.nonce);
  const tag = b64ToU8(packet.tag);
  const ciphertext = b64ToU8(packet.ciphertext);
  const aad = te.encode(`${packet.sender_node_id}->${packet.receiver_node_id}`);

  const plaintext = aeadDecrypt(sessionKey, nonce, ciphertext, tag, aad);
  if (plaintext === null) {
    throw new Error("Packet authentication failed");
  }

  const json = td.decode(plaintext);
  return JSON.parse(json);
}

// ============================================================================
// Unified facade
// ============================================================================

const nzCrypto = {
  util: {
    sha256,
    sha256Hex,
    canonicalize,
    u8ToB64,
    b64ToU8,
  },

  seed: {
    deriveMasterSecret,
    deriveSeedKey,
    deriveSeedKeyFromMnemonic,
  },

  ed25519: {
    sign: ed25519Sign,
    verify: ed25519Verify,
    generateKeyPair: ed25519_generateKeyPair,
    importPrivateKey: ed25519_importPrivateKey,
    importPublicKey: ed25519_importPublicKey,
  },

  x25519: {
    x25519,
    x25519Base,
    generateKeyPair: x25519_generateKeyPair,
    importPrivateKey: x25519_importPrivateKey,
    importPublicKey: x25519_importPublicKey,
  },

  hkdf,
  aead: {
    encrypt: aeadEncrypt,
    decrypt: aeadDecrypt,
  },

  sessionKeys: {
    deriveSessionKeys,
  },

  handshake: {
    aliceStartHandshake,
    bobRespondHandshake,
    aliceFinishHandshake,
  },

  SecureChannel,
  blake2b,

  highLevel: {
    buildSignedPacket,
    verifySignedPacket,
    deriveSessionKey,
    encryptPacket,
    decryptPacket,
  },
};

module.exports = {
  nzCrypto,
  deriveMasterSecret,
  deriveSeedKey,
  deriveSeedKeyFromMnemonic,
  buildSignedPacket,
  verifySignedPacket,
  deriveSessionKey,
  encryptPacket,
  decryptPacket,
};