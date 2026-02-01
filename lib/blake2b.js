// ============================================================================
// BLAKE2b hash module (RFC 7693, 64-bit, node:crypto-backed)
// Provides: blake2b(input, outLen = 64, key?)
// File: lib/blake2b.js
// ============================================================================

const crypto = require("crypto");

// Normalize input to Uint8Array
function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (Buffer.isBuffer(input)) return new Uint8Array(input);
  if (typeof input === "string") return new Uint8Array(Buffer.from(input, "utf8"));
  throw new Error("blake2b: unsupported input type");
}

/**
 * BLAKE2b hash (RFC 7693), using node:crypto "blake2b512" as backend.
 *
 * @param {Uint8Array|Buffer|string} input - message to hash
 * @param {number} outLen - output length in bytes (1..64)
 * @param {Uint8Array|Buffer|null} [key] - optional key (0..64 bytes)
 * @returns {Uint8Array} hash output of length outLen
 */
function blake2b(input, outLen = 64, key = null) {
  if (outLen <= 0 || outLen > 64) {
    throw new Error("blake2b: outLen must be between 1 and 64 bytes");
  }

  const msg = toBytes(input);
  const keyBuf = key ? Buffer.from(key) : undefined;

  const h = crypto.createHash("blake2b512", { key: keyBuf });
  h.update(Buffer.from(msg));
  const full = h.digest();

  return new Uint8Array(full.subarray(0, outLen));
}

module.exports = {
  blake2b,
};