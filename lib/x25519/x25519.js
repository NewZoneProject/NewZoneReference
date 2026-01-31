// Pure JS X25519 implementation using BigInt + Montgomery ladder.

import { bytesToFieldLE, fieldToBytesLE } from './field25519.js';
import { montgomeryLadder } from './montgomery.js';

const BASE_U = 9n;

// Clamp scalar as per RFC 7748
function clampScalar(bytes) {
  const s = new Uint8Array(bytes);
  s[0] &= 248;
  s[31] &= 127;
  s[31] |= 64;
  return s;
}

function scalarBytesToBigInt(s) {
  let x = 0n;
  for (let i = 0; i < 32; i++) {
    x |= BigInt(s[i]) << (8n * BigInt(i));
  }
  return x;
}

export function x25519ScalarMult(privateKey, publicU) {
  const sClamped = clampScalar(privateKey);
  const k = scalarBytesToBigInt(sClamped);
  const u = bytesToFieldLE(publicU);
  const res = montgomeryLadder(k, u);
  return fieldToBytesLE(res);
}

export function x25519GetPublicKey(privateKey) {
  const base = fieldToBytesLE(BASE_U);
  return x25519ScalarMult(privateKey, base);
}

export function x25519GetSharedSecret(privateKey, publicKey) {
  return x25519ScalarMult(privateKey, publicKey);
}

export function x25519RandomPrivateKey() {
  const out = new Uint8Array(32);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(out);
  } else {
    throw new Error('No secure random source available');
  }

  return clampScalar(out);
}