// Run: node tests/sha512.test.js

import { sha512 } from '../lib/ed25519/sha512.js';
import { createHash } from 'node:crypto';

function hex(u8) {
  return Array.from(u8).map(x => x.toString(16).padStart(2, '0')).join('');
}

function assert(cond, msg) {
  if (!cond) throw new Error("SHA-512 test failed: " + msg);
}

function sha512_node(msg) {
  const m = msg instanceof Uint8Array ? msg : new Uint8Array(msg);
  const h = createHash('sha512').update(m).digest();
  return new Uint8Array(h.buffer, h.byteOffset, h.byteLength);
}

console.log("\n--- SHA-512 test ---");

const encoder = new TextEncoder();

const vectors = [
  new Uint8Array([]),
  encoder.encode("abc"),
  encoder.encode("The quick brown fox jumps over the lazy dog"),
  encoder.encode("NewZone / nz-crypto / sha512")
];

vectors.forEach((msg, i) => {
  const ours = sha512(msg);
  const ref = sha512_node(msg);

  console.log(`Vector ${i}:`);
  console.log(" ours:", hex(ours));
  console.log(" ref :", hex(ref));
  assert(hex(ours) === hex(ref), `mismatch on vector ${i}`);
});

console.log("\nAll SHA-512 tests passed.\n");