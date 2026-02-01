// ============================================================================
// NZ-CRYPTO-SEED-01
// Mnemonic + password → master secret → per-context seed keys
//
// This module is intentionally minimal and self-contained. It does not know
// anything about Ed25519, X25519, or higher-level protocols.
// ============================================================================

const crypto = require("crypto");

const te = new TextEncoder();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sha256(bytes) {
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(bytes));
  return new Uint8Array(hash.digest());
}

// Normalize mnemonic: trim, lowercase, single spaces
function normalizeMnemonic(mnemonic) {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Step 1: mnemonic → 32-byte seed
// ---------------------------------------------------------------------------
function mnemonicToSeed(mnemonic) {
  const normalized = normalizeMnemonic(mnemonic);
  const bytes = te.encode(normalized);
  return sha256(bytes); // 32-byte deterministic seed
}

// ---------------------------------------------------------------------------
// Step 2: simple KDF(seed, password) → master_secret (32 bytes)
//
// This is intentionally simple and deterministic. For stronger setups you can
// replace this with PBKDF2/Argon2, but for NZ-CRYPTO-01 reference this is
// sufficient and portable.
// ---------------------------------------------------------------------------
function simpleKDF(seedBytes, passwordBytes, iterations = 1000) {
  let out = new Uint8Array(seedBytes.length + passwordBytes.length);
  out.set(seedBytes);
  out.set(passwordBytes, seedBytes.length);

  for (let i = 0; i < iterations; i++) {
    out = sha256(out);
  }
  return out; // 32 bytes
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive 32-byte master secret from mnemonic + password.
 *
 * @param {string} mnemonic - 24-word mnemonic (or any phrase)
 * @param {string} password - user password
 * @returns {Uint8Array} 32-byte master secret
 */
function deriveMasterSecret(mnemonic, password) {
  const seed = mnemonicToSeed(mnemonic);
  const pwd = te.encode(password);
  return simpleKDF(seed, pwd);
}

/**
 * HKDF-like derivation from masterSecret and context path.
 * For seed-level derivation we use HMAC-SHA256 in a simple HKDF-Expand form.
 */
function hkdfExpand(masterSecret, info, length = 32) {
  const key = Buffer.from(masterSecret);
  const infoBuf = Buffer.from(info, "utf8");

  // Single-block HKDF-Expand: T1 = HMAC(master, info || 0x01)
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(infoBuf);
  hmac.update(Buffer.from([0x01]));
  const t1 = hmac.digest();

  return new Uint8Array(t1.slice(0, length));
}

/**
 * Derive a 32-byte seed key from masterSecret and a logical path.
 *
 * @param {Uint8Array} masterSecret - 32-byte master secret
 * @param {string} path - logical path, e.g. "ed25519/identity", "x25519/session"
 * @returns {Uint8Array} 32-byte seed key
 */
function deriveSeedKey(masterSecret, path) {
  const info = "nz:" + path;
  return hkdfExpand(masterSecret, info, 32);
}

/**
 * Convenience: mnemonic + password + path → 32-byte seed key.
 */
function deriveSeedKeyFromMnemonic(mnemonic, password, path) {
  const master = deriveMasterSecret(mnemonic, password);
  return deriveSeedKey(master, path);
}

module.exports = {
  deriveMasterSecret,
  deriveSeedKey,
  deriveSeedKeyFromMnemonic,
};