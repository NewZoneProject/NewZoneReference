// tests/x25519-rfc.js
// Run: node tests/x25519-rfc.js

import {
  x25519ScalarMult,
  x25519GetPublicKey,
  x25519GetSharedSecret,
} from '../lib/x25519/x25519.js';

function hex(u8) {
  return Array.from(u8).map(x => x.toString(16).padStart(2, '0')).join('');
}

function fromHex(h) {
  if (h.length % 2 !== 0) throw new Error('fromHex: invalid length');
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function assert(cond, msg) {
  if (!cond) throw new Error('X25519 RFC test failed: ' + msg);
}

console.log('\n=== X25519 RFC 7748 Test ===\n');

// RFC 7748, section 6.1, Test vector 1

const scalar1 = fromHex(
  'a546e36bf0527c9d3b16154b82465edd' +
  '62144c0ac1fc5a18506a2244ba449ac4'
);

const u1 = fromHex(
  'e6db6867583030db3594c1a424b15f7c' +
  '726624ec26b3353b10a903a6d0ab1c4c'
);

const expected1 = fromHex(
  'c3da55379de9c6908e94ea4df28d084f' +
  '32eccf03491c71f754b4075577a28552'
);

console.log('Vector 1:');
console.log('scalar1 :', hex(scalar1));
console.log('u1      :', hex(u1));
console.log('expect  :', hex(expected1));

const out1 = x25519ScalarMult(scalar1, u1);
console.log('ours    :', hex(out1));
assert(hex(out1) === hex(expected1), 'vector 1 mismatch');

// RFC 7748, section 6.1, Test vector 2

const scalar2 = fromHex(
  '4b66e9d4d1b4673c5ad22691957d6af5' +
  'c11b6421c6a35bb3e35d3d6939f0a8d4'
);

const u2 = fromHex(
  'e5210f12786811d3f4b7959d0538ae2c' +
  '31db40c6f2d1b2ffe0c5d5d9d1c0f6c1'
);

const expected2 = fromHex(
  '95cbde9476e8907d7aade45cb4b873f8' +
  '8b595a68799fa152e6f8f7647aac7957'
);

console.log('\nVector 2:');
console.log('scalar2 :', hex(scalar2));
console.log('u2      :', hex(u2));
console.log('expect  :', hex(expected2));

const out2 = x25519ScalarMult(scalar2, u2);
console.log('ours    :', hex(out2));
assert(hex(out2) === hex(expected2), 'vector 2 mismatch');

// Sanity: our getPublicKey + sharedSecret must be consistent

console.log('\nSanity check with our API:');

const privA = scalar1;
const privB = scalar2;

const pubA = x25519GetPublicKey(privA);
const pubB = x25519GetPublicKey(privB);

console.log('pubA:', hex(pubA));
console.log('pubB:', hex(pubB));

const ss1 = x25519GetSharedSecret(privA, pubB);
const ss2 = x25519GetSharedSecret(privB, pubA);

console.log('ss1 (A,B):', hex(ss1));
console.log('ss2 (B,A):', hex(ss2));

assert(hex(ss1) === hex(ss2), 'shared secrets mismatch');

console.log('\nAll X25519 RFC tests passed.\n');