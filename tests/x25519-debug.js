// tests/x25519-debug.js
// Run: node tests/x25519-debug.js

import {
  x25519GetPublicKey,
  x25519GetSharedSecret,
} from '../lib/x25519/x25519.js';

import {
  randomBytes,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
} from 'node:crypto';

function hex(u8) {
  return Array.from(u8).map(x => x.toString(16).padStart(2, '0')).join('');
}

function assert(cond, msg) {
  if (!cond) throw new Error('X25519 test failed: ' + msg);
}

// Same clamp as in x25519.js
function clampScalar(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) {
    throw new Error('clampScalar: expected 32-byte Uint8Array');
  }
  const s = new Uint8Array(bytes);
  s[0] &= 248;
  s[31] &= 127;
  s[31] |= 64;
  return s;
}

// Build Node.js X25519 private key from raw 32-byte scalar
function nodeX25519PrivateKeyFromRaw(raw32) {
  const pkcs8Prefix = Buffer.from('302e020100300506032b656e04220420', 'hex');
  const der = Buffer.concat([pkcs8Prefix, Buffer.from(raw32)]);
  return createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
}

// Build Node.js X25519 public key from raw 32-byte u-coordinate
function nodeX25519PublicKeyFromRaw(raw32) {
  const spkiPrefix = Buffer.from('302a300506032b656e032100', 'hex');
  const der = Buffer.concat([spkiPrefix, Buffer.from(raw32)]);
  return createPublicKey({ key: der, format: 'der', type: 'spki' });
}

function nodeX25519GetPublicKey(privRaw32) {
  const privKey = nodeX25519PrivateKeyFromRaw(privRaw32);
  const pubKey = createPublicKey(privKey);
  const spki = pubKey.export({ format: 'der', type: 'spki' });
  const pubRaw = spki.subarray(spki.length - 32);
  return new Uint8Array(pubRaw);
}

function nodeX25519GetSharedSecret(privRaw32, peerPubRaw32) {
  const privKey = nodeX25519PrivateKeyFromRaw(privRaw32);
  const pubKey = nodeX25519PublicKeyFromRaw(peerPubRaw32);
  const ss = diffieHellman({ privateKey: privKey, publicKey: pubKey });
  return new Uint8Array(ss);
}

console.log('\n=== X25519 Debug Test ===\n');

// Generate two random private scalars (clamped)
const privA = clampScalar(new Uint8Array(randomBytes(32)));
const privB = clampScalar(new Uint8Array(randomBytes(32)));

console.log('privA:', hex(privA));
console.log('privB:', hex(privB));

// Our public keys
const ourPubA = x25519GetPublicKey(privA);
const ourPubB = x25519GetPublicKey(privB);

console.log('\n→ Our public keys:');
console.log('ourPubA:', hex(ourPubA));
console.log('ourPubB:', hex(ourPubB));

// Node.js public keys from same private scalars
const nodePubA = nodeX25519GetPublicKey(privA);
const nodePubB = nodeX25519GetPublicKey(privB);

console.log('\n→ Node public keys:');
console.log('nodePubA:', hex(nodePubA));
console.log('nodePubB:', hex(nodePubB));

assert(hex(ourPubA) === hex(nodePubA), 'ourPubA != nodePubA');
assert(hex(ourPubB) === hex(nodePubB), 'ourPubB != nodePubB');

// Our shared secrets
const ourSS1 = x25519GetSharedSecret(privA, ourPubB);
const ourSS2 = x25519GetSharedSecret(privB, ourPubA);

console.log('\n→ Our shared secrets:');
console.log('ourSS1 (A,B):', hex(ourSS1));
console.log('ourSS2 (B,A):', hex(ourSS2));

assert(hex(ourSS1) === hex(ourSS2), 'ourSS1 != ourSS2');

// Node shared secrets (using our public keys)
const nodeSS1 = nodeX25519GetSharedSecret(privA, ourPubB);
const nodeSS2 = nodeX25519GetSharedSecret(privB, ourPubA);

console.log('\n→ Node shared secrets (with our pubs):');
console.log('nodeSS1 (A,B):', hex(nodeSS1));
console.log('nodeSS2 (B,A):', hex(nodeSS2));

assert(hex(ourSS1) === hex(nodeSS1), 'ourSS1 != nodeSS1');
assert(hex(ourSS2) === hex(nodeSS2), 'ourSS2 != nodeSS2');

console.log('\nAll X25519 debug checks passed.\n');