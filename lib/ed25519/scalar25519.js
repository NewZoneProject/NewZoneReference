// Scalar arithmetic for Ed25519 (pure JS, BigInt)
// Order of the base point subgroup:
// L = 2^252 + 27742317777372353535851937790883648493

// Group order L (RFC 8032)
export const L = BigInt(
  "723700557733226221397318656304299424085711635937990760600195093828545425857"
);

// Convert 32-byte LE Uint8Array → BigInt
export function bytesToScalarLE(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) {
    throw new Error("bytesToScalarLE: expected 32-byte Uint8Array");
  }
  let x = 0n;
  for (let i = 0; i < 32; i++) {
    x |= BigInt(bytes[i]) << (8n * BigInt(i));
  }
  return x;
}

// Convert BigInt → 32-byte LE Uint8Array
export function scalarToBytesLE(s) {
  let x = s;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

// Reduce BigInt modulo L
export function modL(x) {
  const r = x % L;
  return r >= 0n ? r : r + L;
}

// Clamp private scalar for Ed25519 (RFC 8032)
// This is applied to the *first half* of SHA-512(private_key_seed)
export function clampEd25519Scalar(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) {
    throw new Error("clampEd25519Scalar: expected 32-byte Uint8Array");
  }

  const s = new Uint8Array(bytes);

  // Clear lowest 3 bits
  s[0] &= 248;

  // Clear highest bit
  s[31] &= 127;

  // Set second highest bit
  s[31] |= 64;

  return s;
}

// Prepare scalar for point multiplication:
// - convert bytes → BigInt
// - clamp
// - reduce mod L
export function prepareScalarForMul(bytes) {
  const clamped = clampEd25519Scalar(bytes);
  const k = bytesToScalarLE(clamped);
  return modL(k);
}

// Convert arbitrary-length Uint8Array (LE) → BigInt
export function bytesToBigIntLE(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("bytesToBigIntLE: expected Uint8Array");
  }
  let x = 0n;
  for (let i = 0; i < bytes.length; i++) {
    x |= BigInt(bytes[i]) << (8n * BigInt(i));
  }
  return x;
}

export function bytesToBigIntBE(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("bytesToBigIntBE: expected Uint8Array");
  }
  let x = 0n;
  for (let i = 0; i < bytes.length; i++) {
    x = (x << 8n) | BigInt(bytes[i]);
  }
  return x;
}