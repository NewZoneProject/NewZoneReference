// NZ-CRYPTO-01 adapter: Ed25519 (noble) + pure X25519

import { nzCrypto } from './nz-crypto.js';

// ----------------------
// Ed25519 (noble)
// ----------------------
import * as ed from '@noble/ed25519';

nzCrypto.ed25519 = {
  async generateKeyPair() {
    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = await ed.getPublicKeyAsync(privateKey);
    return { publicKey, privateKey };
  },

  async importPrivateKey(seed32) {
    if (!(seed32 instanceof Uint8Array) || seed32.length !== 32) {
      throw new Error('Ed25519 private key must be 32 bytes');
    }
    const privateKey = seed32;
    const publicKey = await ed.getPublicKeyAsync(privateKey);
    return { publicKey, privateKey };
  },

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

// ----------------------
// Pure X25519
// ----------------------
import {
  x25519GetPublicKey,
  x25519GetSharedSecret,
  x25519RandomPrivateKey
} from './x25519/x25519.js';

nzCrypto.x25519 = {
  async generateKeyPair() {
    const privateKey = x25519RandomPrivateKey();
    const publicKey = x25519GetPublicKey(privateKey);
    return { publicKey, privateKey };
  },

  async importPrivateKey(seed32) {
    const privateKey = new Uint8Array(seed32);
    const publicKey = x25519GetPublicKey(privateKey);
    return { publicKey, privateKey };
  },

  async importPublicKey(pub32) {
    return new Uint8Array(pub32);
  },

  async deriveSharedSecret(privateKey, publicKey) {
    return x25519GetSharedSecret(privateKey, publicKey);
  }
};

export default nzCrypto;