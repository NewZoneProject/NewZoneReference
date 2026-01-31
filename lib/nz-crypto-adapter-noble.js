// NZ-CRYPTO-01 adapter for noble crypto primitives.
// Connects noble's Ed25519 and X25519 implementations
// to the unified protocol layer defined in nz-crypto.js.

import * as ed from '@noble/ed25519';
import { curve25519 } from '@noble/curves/curve25519';
import { nzCrypto } from './nz-crypto.js';

// ------------------------------------------------------------
// Ed25519 — signatures + deterministic key import
// ------------------------------------------------------------

nzCrypto.ed25519 = {
  // Generate random Ed25519 keypair
  async generateKeyPair() {
    const privateKey = ed.utils.randomPrivateKey(); // Uint8Array(32)
    const publicKey = await ed.getPublicKeyAsync(privateKey);
    return { publicKey, privateKey };
  },

  // Import deterministic 32-byte private key (from SEED)
  async importPrivateKey(seed32) {
    if (!(seed32 instanceof Uint8Array) || seed32.length !== 32) {
      throw new Error('Ed25519 private key must be 32 bytes');
    }
    const privateKey = seed32;
    const publicKey = await ed.getPublicKeyAsync(privateKey);
    return { publicKey, privateKey };
  },

  // Import deterministic public key (optional)
  async importPublicKey(pub32) {
    if (!(pub32 instanceof Uint8Array) || pub32.length !== 32) {
      throw new Error('Ed25519 public key must be 32 bytes');
    }
    return pub32;
  },

  async sign(messageUint8, privateKeyUint8) {
    return await ed.signAsync(messageUint8, privateKeyUint8);
  },

  async verify(signatureUint8, messageUint8, publicKeyUint8) {
    return await ed.verifyAsync(signatureUint8, messageUint8, publicKeyUint8);
  }
};

// ------------------------------------------------------------
// X25519 — key exchange + deterministic key import
// ------------------------------------------------------------

nzCrypto.x25519 = {
  // Random X25519 keypair
  async generateKeyPair() {
    const privateKey = curve25519.utils.randomPrivateKey(); // Uint8Array(32)
    const publicKey = curve25519.getPublicKey(privateKey);
    return { publicKey, privateKey };
  },

  // Import deterministic 32-byte private key (from SEED)
  async importPrivateKey(seed32) {
    if (!(seed32 instanceof Uint8Array) || seed32.length !== 32) {
      throw new Error('X25519 private key must be 32 bytes');
    }
    const privateKey = seed32;
    const publicKey = curve25519.getPublicKey(privateKey);
    return { publicKey, privateKey };
  },

  // Import deterministic public key (optional)
  async importPublicKey(pub32) {
    if (!(pub32 instanceof Uint8Array) || pub32.length !== 32) {
      throw new Error('X25519 public key must be 32 bytes');
    }
    return pub32;
  },

  async deriveSharedSecret(privateKeyUint8, publicKeyUint8) {
    return curve25519.scalarMult(privateKeyUint8, publicKeyUint8);
  }
};

export default nzCrypto;