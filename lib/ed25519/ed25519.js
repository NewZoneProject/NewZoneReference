// Ed25519 via Node.js crypto for sign/verify/getPublicKey
// Остальной стек (field, Edwards, scalar) остаётся как есть.

import { createPrivateKey, createPublicKey, sign as nodeSign, verify as nodeVerify } from 'node:crypto';

// seed32: 32-byte private seed
export function ed25519GetPublicKey(seed32) {
  if (!(seed32 instanceof Uint8Array) || seed32.length !== 32) {
    throw new Error("ed25519GetPublicKey: expected 32-byte seed");
  }

  // PKCS#8 DER for Ed25519 private key: 0x302e020100300506032b657004220420 || seed
  const derPrefix = Buffer.from("302e020100300506032b657004220420", "hex");
  const der = Buffer.concat([derPrefix, Buffer.from(seed32)]);

  const privKey = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
  const pubKey = createPublicKey(privKey);

  // SPKI DER for Ed25519 public key: 0x302a300506032b6570032100 || pub
  const spki = pubKey.export({ format: 'der', type: 'spki' });
  // последние 32 байта — сам публичный ключ
  const pubBytes = spki.subarray(spki.length - 32);

  return new Uint8Array(pubBytes);
}

export function ed25519Sign(message, seed32) {
  if (!(seed32 instanceof Uint8Array) || seed32.length !== 32) {
    throw new Error("ed25519Sign: expected 32-byte seed");
  }

  const msg = message instanceof Uint8Array ? message : new Uint8Array(message);

  const derPrefix = Buffer.from("302e020100300506032b657004220420", "hex");
  const der = Buffer.concat([derPrefix, Buffer.from(seed32)]);

  const privKey = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
  const sig = nodeSign(null, Buffer.from(msg), privKey); // raw 64-byte Ed25519 signature

  return new Uint8Array(sig);
}

export function ed25519Verify(message, signature, publicKey) {
  const msg = message instanceof Uint8Array ? message : new Uint8Array(message);
  if (!(signature instanceof Uint8Array) || signature.length !== 64) return false;
  if (!(publicKey instanceof Uint8Array) || publicKey.length !== 32) return false;

  // SPKI DER for Ed25519 public key: 0x302a300506032b6570032100 || pub
  const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
  const spki = Buffer.concat([spkiPrefix, Buffer.from(publicKey)]);

  const pubKey = createPublicKey({ key: spki, format: 'der', type: 'spki' });

  return nodeVerify(null, Buffer.from(msg), pubKey, Buffer.from(signature));
}