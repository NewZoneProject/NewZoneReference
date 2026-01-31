// SHA-512 via Node.js built-in crypto
// Returns 64-byte Uint8Array

import { createHash } from 'node:crypto';

export function sha512(message) {
  const m = message instanceof Uint8Array ? message : new Uint8Array(message);
  const hash = createHash('sha512');
  hash.update(m);
  const buf = hash.digest(); // Buffer
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}