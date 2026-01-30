// NZ-CRYPTO-01 adapter for noble crypto primitives.
// This file connects noble's Ed25519 and X25519 implementations
// to the unified protocol layer defined in nz-crypto.js.

import * as ed from '@noble/ed25519';
import { curve25519 } from '@noble/curves/curve25519';
import { nzCrypto } from './nz-crypto.js';

// ------------------------------------------------------------
// Ed25519 — signatures
// ------------------------------------------------------------

nzCrypto.ed25519 = {
  async generateKeyPair() {
    const privateKey = ed.utils.randomPrivateKey(); // Uint8Array(32)
    const publicKey = await ed.getPublicKeyAsync(privateKey);
    return { publicKey, privateKey };
  },

  async sign(messageUint8, privateKeyUint8) {
    return await ed.signAsync(messageUint8, privateKeyUint8);
  },

  async verify(signatureUint8, messageUint8, publicKeyUint8) {
    return await ed.verifyAsync(signatureUint8, messageUint8, publicKeyUint8);
  }
};

// ------------------------------------------------------------
// X25519 — key exchange
// ------------------------------------------------------------

nzCrypto.x25519 = {
  async generateKeyPair() {
    const privateKey = curve25519.utils.randomPrivateKey();
    const publicKey = curve25519.getPublicKey(privateKey);
    return { publicKey, privateKey };
  },

  async deriveSharedSecret(privateKeyUint8, publicKeyUint8) {
    return curve25519.scalarMult(privateKeyUint8, publicKeyUint8);
  }
};

export default nzCrypto;