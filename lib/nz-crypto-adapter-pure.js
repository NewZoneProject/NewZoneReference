// ============================================================================
// nz-crypto-adapter-pure.js
// NZ-CRYPTO-01 adapter: pure Ed25519 + pure X25519
//
// This module exposes a "pureAdapter" object that provides Ed25519 and X25519
// operations using the pure JS implementations in this repository.
//
// It does NOT mutate nzCrypto directly. The facade (nz-crypto.js) can either
// use its own direct imports (Node reference build) or wire this adapter in a
// browser/alt build.
// ============================================================================

const crypto = require("crypto");

const {
  ed25519GetPublicKey,
  ed25519Sign,
  ed25519Verify,
} = require("./ed25519.js");

const { x25519, x25519Base } = require("./x25519.js");

// ---------------------------------------------------------------------------
// Random helpers
// ---------------------------------------------------------------------------

function randomSeed32() {
  const out = new Uint8Array(32);
  crypto.randomFillSync(out);
  return out;
}

function randomX25519Scalar() {
  const out = new Uint8Array(32);
  crypto.randomFillSync(out);
  return out;
}

// ---------------------------------------------------------------------------
// Ed25519 adapter
// ---------------------------------------------------------------------------

const ed25519Adapter = {
  /**
   * Generate a new Ed25519 key pair from random 32-byte seed.
   *
   * @returns {{ publicKey: Uint8Array, privateKey: Uint8Array }}
   */
  generateKeyPair() {
    const privateKey = randomSeed32();
    const publicKey = ed25519GetPublicKey(privateKey);
    return { publicKey, privateKey };
  },

  /**
   * Import a 32-byte Ed25519 private key (seed) and derive its public key.
   *
   * @param {Uint8Array} seed32
   * @returns {{ publicKey: Uint8Array, privateKey: Uint8Array }}
   */
  importPrivateKey(seed32) {
    if (!(seed32 instanceof Uint8Array) || seed32.length !== 32) {
      throw new Error("Ed25519 private key must be 32 bytes");
    }
    const privateKey = new Uint8Array(seed32);
    const publicKey = ed25519GetPublicKey(privateKey);
    return { publicKey, privateKey };
  },

  /**
   * Import a 32-byte Ed25519 public key.
   *
   * @param {Uint8Array} pub32
   * @returns {Uint8Array}
   */
  importPublicKey(pub32) {
    if (!(pub32 instanceof Uint8Array) || pub32.length !== 32) {
      throw new Error("Ed25519 public key must be 32 bytes");
    }
    return new Uint8Array(pub32);
  },

  /**
   * Sign message with Ed25519 private key.
   *
   * @param {Uint8Array} messageUint8
   * @param {Uint8Array} privateKeyUint8
   * @returns {Uint8Array} 64-byte signature
   */
  sign(messageUint8, privateKeyUint8) {
    return ed25519Sign(messageUint8, privateKeyUint8);
  },

  /**
   * Verify Ed25519 signature.
   *
   * @param {Uint8Array} signatureUint8
   * @param {Uint8Array} messageUint8
   * @param {Uint8Array} publicKeyUint8
   * @returns {boolean}
   */
  verify(signatureUint8, messageUint8, publicKeyUint8) {
    return ed25519Verify(messageUint8, signatureUint8, publicKeyUint8);
  },
};

// ---------------------------------------------------------------------------
// X25519 adapter
// ---------------------------------------------------------------------------

const x25519Adapter = {
  /**
   * Generate a new X25519 key pair from random scalar.
   *
   * @returns {{ publicKey: Uint8Array, privateKey: Uint8Array }}
   */
  generateKeyPair() {
    const privateKey = randomX25519Scalar();
    const publicKey = x25519Base(privateKey);
    return { publicKey, privateKey };
  },

  /**
   * Import a 32-byte X25519 private key and derive its public key.
   *
   * @param {Uint8Array} seed32
   * @returns {{ publicKey: Uint8Array, privateKey: Uint8Array }}
   */
  importPrivateKey(seed32) {
    if (!(seed32 instanceof Uint8Array) || seed32.length !== 32) {
      throw new Error("X25519 private key must be 32 bytes");
    }
    const privateKey = new Uint8Array(seed32);
    const publicKey = x25519Base(privateKey);
    return { publicKey, privateKey };
  },

  /**
   * Import a 32-byte X25519 public key.
   *
   * @param {Uint8Array} pub32
   * @returns {Uint8Array}
   */
  importPublicKey(pub32) {
    if (!(pub32 instanceof Uint8Array) || pub32.length !== 32) {
      throw new Error("X25519 public key must be 32 bytes");
    }
    return new Uint8Array(pub32);
  },

  /**
   * Derive shared secret using X25519.
   *
   * @param {Uint8Array} privateKey
   * @param {Uint8Array} publicKey
   * @returns {Uint8Array} 32-byte shared secret
   */
  deriveSharedSecret(privateKey, publicKey) {
    return x25519(privateKey, publicKey);
  },
};

// ---------------------------------------------------------------------------
// Unified pure adapter
// ---------------------------------------------------------------------------

const pureAdapter = {
  ed25519: ed25519Adapter,
  x25519: x25519Adapter,
};

module.exports = {
  pureAdapter,
};