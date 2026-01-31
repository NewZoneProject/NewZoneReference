// Pure Ed25519 strict test
// Run: node tests/ed25519.test.js

import {
  ed25519GetPublicKey,
  ed25519Sign,
  ed25519Verify
} from '../lib/ed25519/ed25519.js';

function assert(cond, msg) {
  if (!cond) throw new Error("Ed25519 test failed: " + msg);
}

function hex(u8) {
  return Array.from(u8).map(x => x.toString(16).padStart(2, '0')).join('');
}

console.log("\n--- Ed25519 strict test ---");

// Deterministic seed
const seed = new Uint8Array(32).map((_, i) => i + 1);

// Message
const encoder = new TextEncoder();
const msg = encoder.encode("hello ed25519 minimal test");

// 1) Public key derivation
console.log("Test 1: public key derivation");
const pub = ed25519GetPublicKey(seed);
assert(pub instanceof Uint8Array && pub.length === 32, "public key must be 32 bytes");
console.log("✓ public key derivation");

// 2) Sign & verify (valid)
console.log("Test 2: sign & verify (valid)");
const sig = ed25519Sign(msg, seed);
assert(sig instanceof Uint8Array && sig.length === 64, "signature must be 64 bytes");
const ok = ed25519Verify(msg, sig, pub);
assert(ok === true, "verify must return true for valid signature");
console.log("✓ sign & verify (valid)");

// 3) Sign & verify (tampered message)
console.log("Test 3: sign & verify (tampered message)");
const tampered = new Uint8Array(msg);
tampered[0] ^= 0x01;
const ok2 = ed25519Verify(tampered, sig, pub);
assert(ok2 === false, "verify must return false for tampered message");
console.log("✓ sign & verify (tampered)");

// 4) Sign & verify (tampered signature)
console.log("Test 4: sign & verify (tampered signature)");
const sigBad = new Uint8Array(sig);
sigBad[10] ^= 0x01;
const ok3 = ed25519Verify(msg, sigBad, pub);
assert(ok3 === false, "verify must return false for tampered signature");
console.log("✓ sign & verify (tampered signature)");

console.log("\nAll Ed25519 strict tests passed.\n");