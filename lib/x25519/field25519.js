// Field arithmetic for p = 2^255 - 19 using BigInt.

const P = (1n << 255n) - 19n;

function mod(a) {
  let x = a % P;
  return x >= 0n ? x : x + P;
}

export function fAdd(a, b) {
  return mod(a + b);
}

export function fSub(a, b) {
  return mod(a - b);
}

export function fMul(a, b) {
  return mod(a * b);
}

// Exponentiation by square-and-multiply
export function fPow(a, e) {
  let x = mod(a);
  let r = 1n;
  let n = e;
  while (n > 0n) {
    if (n & 1n) r = mod(r * x);
    x = mod(x * x);
    n >>= 1n;
  }
  return r;
}

// Inverse via a^(p-2)
export function fInv(a) {
  return fPow(a, P - 2n);
}

// Convert 32-byte LE Uint8Array → BigInt
export function bytesToFieldLE(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) {
    throw new Error('bytesToFieldLE: expected 32-byte Uint8Array');
  }

  // Work on a copy to avoid mutating caller buffers
  const b = new Uint8Array(bytes);

  // RFC 7748: u-coordinate is interpreted as 255-bit integer mod p.
  // We clear bit 255 to keep it in range and avoid ambiguity.
  b[31] &= 0x7F;

  let x = 0n;
  for (let i = 0; i < 32; i++) {
    x |= BigInt(b[i]) << (8n * BigInt(i));
  }
  return mod(x);
}

// Convert BigInt → 32-byte LE Uint8Array
export function fieldToBytesLE(x) {
  let v = mod(x);
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}