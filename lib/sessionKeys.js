// ============================================================================
// Session key derivation module (X25519 → HKDF → AEAD-ready keys)
// Uses: HKDF (SHA-512 or BLAKE2b), BLAKE2b for context binding
// File: lib/sessionKeys.js
// ============================================================================

const { blake2b } = require("./blake2b.js");
const { hkdf } = require("./hkdf.js");

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function toBytes(input) {
  if (input == null) return new Uint8Array(0);
  if (input instanceof Uint8Array) return input;
  if (Buffer.isBuffer(input)) return new Uint8Array(input);
  if (typeof input === "string") return new Uint8Array(Buffer.from(input, "utf8"));
  throw new Error("sessionKeys: unsupported input type");
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// ---------------------------------------------------------------------------
// deriveSessionKeys
// ---------------------------------------------------------------------------
/**
 * Derive asymmetric session keys from a shared secret and context.
 *
 * Typical usage:
 *   - sharedSecret: X25519(a, B) == X25519(b, A)
 *   - context: protocol name, channel id, role, etc.
 *
 * Output:
 *   - encKey: encryption key (for "this" side)
 *   - decKey: decryption key (for "this" side)
 *   - nonceBase: 12-byte base for nonce derivation
 *   - sessionId: 16-byte identifier
 *   - contextHash: 32-byte hash of context
 *
 * @param {Object} params
 * @param {Uint8Array|Buffer} params.sharedSecret - raw shared secret (e.g. X25519 output)
 * @param {Uint8Array|Buffer|string} params.context - binding context (protocol, channel, role)
 * @param {"sha512"|"blake2b"} [params.hash="sha512"] - HKDF hash
 * @param {number} [params.keyLength=32] - length of enc/dec keys
 * @returns {{
 *   encKey: Uint8Array,
 *   decKey: Uint8Array,
 *   nonceBase: Uint8Array,
 *   sessionId: Uint8Array,
 *   contextHash: Uint8Array
 * }}
 */
function deriveSessionKeys(params) {
  const {
    sharedSecret,
    context,
    hash = "sha512",
    keyLength = 32,
  } = params || {};

  if (!sharedSecret) {
    throw new Error("deriveSessionKeys: sharedSecret is required");
  }

  const ss = toBytes(sharedSecret);
  const ctx = toBytes(context);

  if (ss.length === 0) {
    throw new Error("deriveSessionKeys: sharedSecret must be non-empty");
  }
  if (keyLength <= 0 || keyLength > 64) {
    throw new Error("deriveSessionKeys: keyLength must be between 1 and 64");
  }

  // Context hash: binds keys to a specific protocol / channel / role
  const contextHash = blake2b(ctx, 32);

  // Session ID: short identifier for logging / protocol use
  const sessionId = blake2b(concatBytes(ss, ctx), 16);

  // HKDF info: include context hash and a label
  const info = concatBytes(
    contextHash,
    toBytes("NZ-CRYPTO-02/session-keys")
  );

  // Salt: contextHash (acts as salt to separate different contexts)
  const salt = contextHash;

  // Total material: encKey || decKey || nonceBase(12 bytes)
  const totalLen = keyLength * 2 + 12;
  const okm = hkdf(hash, salt, ss, info, totalLen);

  const encKey = okm.subarray(0, keyLength);
  const decKey = okm.subarray(keyLength, keyLength * 2);
  const nonceBase = okm.subarray(keyLength * 2, keyLength * 2 + 12);

  return {
    encKey,
    decKey,
    nonceBase,
    sessionId,
    contextHash,
  };
}

module.exports = {
  deriveSessionKeys,
};