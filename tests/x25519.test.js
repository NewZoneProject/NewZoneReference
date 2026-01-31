// Pure X25519 strict test
// Run: node tests/x25519.test.js

import {
  x25519GetPublicKey,
  x25519GetSharedSecret,
  x25519ScalarMult
} from '../lib/x25519/x25519.js';

function hex(u8) {
  return Array.from(u8).map(x => x.toString(16).padStart(2, '0')).join('');
}

function assert(cond, msg) {
  if (!cond) throw new Error("X25519 test failed: " + msg);
}

console.log("\n--- X25519 strict test ---");

// ------------------------------------------------------------
// 1. Deterministic public key
// ------------------------------------------------------------
console.log("Test 1: deterministic public key");

const priv1 = new Uint8Array(32).fill(1);
const pub1a = x25519GetPublicKey(priv1);
const pub1b = x25519GetPublicKey(priv1);

assert(hex(pub1a) === hex(pub1b), "public key must be deterministic");

console.log("✓ deterministic public key");

// ------------------------------------------------------------
// 2. Symmetric shared secret
// ------------------------------------------------------------
console.log("Test 2: symmetric shared secret");

const privA = new Uint8Array(32).map((_, i) => i + 1);
const privB = new Uint8Array(32).map((_, i) => 255 - i);

const pubA = x25519GetPublicKey(privA);
const pubB = x25519GetPublicKey(privB);

const sharedAB = x25519GetSharedSecret(privA, pubB);
const sharedBA = x25519GetSharedSecret(privB, pubA);

assert(
  hex(sharedAB) === hex(sharedBA),
  "shared secret must be symmetric (A↔B)"
);

console.log("✓ symmetric shared secret");

// ------------------------------------------------------------
// 3. Scalar multiplication sanity check
// ------------------------------------------------------------
console.log("Test 3: scalar multiplication sanity");

const baseU = new Uint8Array(32);
baseU[0] = 9;

const privX = new Uint8Array(32).fill(7);
const pubX = x25519ScalarMult(privX, baseU);

assert(pubX instanceof Uint8Array, "scalarMult must return Uint8Array");
assert(pubX.length === 32, "scalarMult must return 32 bytes");

console.log("✓ scalar multiplication sanity");

// ------------------------------------------------------------
// 4. Clamping check (indirect)
// ------------------------------------------------------------
console.log("Test 4: clamping check");

const privClampTest = new Uint8Array(32).fill(0xff);
const pubClamp = x25519GetPublicKey(privClampTest);

// RFC 7748: clamped scalar must not produce all-zero output
assert(hex(pubClamp) !== "00".repeat(32), "clamping must avoid zero output");

console.log("✓ clamping check");

console.log("\nAll X25519 strict tests passed.\n");