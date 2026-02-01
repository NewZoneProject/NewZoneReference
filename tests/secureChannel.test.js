// ============================================================================
// Tests for SecureChannel (AEAD, bidirectional, rekey)
// Run: node --test tests/secureChannel.test.js
// ============================================================================

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { SecureChannel } = require("../lib/secureChannel.js");

function random32() {
  const out = new Uint8Array(32);
  crypto.getRandomValues(out);
  return out;
}

function hex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

// ---------------------------------------------------------------------------
// Basic encryption/decryption
// ---------------------------------------------------------------------------

test("SecureChannel: basic encryption/decryption", () => {
  const sharedSecret = random32();
  const baseContext = "test/secure-channel/basic";

  const alice = new SecureChannel({ sharedSecret, baseContext, role: "alice" });
  const bob = new SecureChannel({ sharedSecret, baseContext, role: "bob" });

  const msg = "Hello Bob";
  const out = alice.encryptToPeer(msg, "AAD");

  const dec = bob.decryptFromPeer(out.nonce, out.ciphertext, out.tag, "AAD");
  assert.equal(Buffer.from(dec).toString(), msg);
});

// ---------------------------------------------------------------------------
// Tampering detection
// ---------------------------------------------------------------------------

test("SecureChannel: tampering must fail", () => {
  const sharedSecret = random32();
  const baseContext = "test/secure-channel/tamper";

  const alice = new SecureChannel({ sharedSecret, baseContext, role: "alice" });
  const bob = new SecureChannel({ sharedSecret, baseContext, role: "bob" });

  const out = alice.encryptToPeer("Test", "AAD");

  const tampered = new Uint8Array(out.ciphertext);
  tampered[0] ^= 1;

  const dec = bob.decryptFromPeer(out.nonce, tampered, out.tag, "AAD");
  assert.equal(dec, null);
});

// ---------------------------------------------------------------------------
// Rekey
// ---------------------------------------------------------------------------

test("SecureChannel: rekey changes keys and breaks old ciphertext", () => {
  const sharedSecret = random32();
  const baseContext = "test/secure-channel/rekey";

  const alice = new SecureChannel({ sharedSecret, baseContext, role: "alice" });
  const bob = new SecureChannel({ sharedSecret, baseContext, role: "bob" });

  const out1 = alice.encryptToPeer("Before rekey", "AAD1");
  const dec1 = bob.decryptFromPeer(out1.nonce, out1.ciphertext, out1.tag, "AAD1");
  assert.equal(Buffer.from(dec1).toString(), "Before rekey");

  alice.rekey();
  bob.rekey();

  const out2 = alice.encryptToPeer("After rekey", "AAD2");
  const dec2 = bob.decryptFromPeer(out2.nonce, out2.ciphertext, out2.tag, "AAD2");
  assert.equal(Buffer.from(dec2).toString(), "After rekey");

  const decOld = bob.decryptFromPeer(out1.nonce, out1.ciphertext, out1.tag, "AAD1");
  assert.equal(decOld, null);
});

// ---------------------------------------------------------------------------
// Session IDs
// ---------------------------------------------------------------------------

test("SecureChannel: send/recv session IDs differ between directions", () => {
  const sharedSecret = random32();
  const baseContext = "test/secure-channel/session-ids";

  const alice = new SecureChannel({ sharedSecret, baseContext, role: "alice" });
  const bob = new SecureChannel({ sharedSecret, baseContext, role: "bob" });

  assert.equal(hex(alice.sessionIdSend), hex(bob.sessionIdRecv));
  assert.equal(hex(alice.sessionIdRecv), hex(bob.sessionIdSend));
  assert.notEqual(hex(alice.sessionIdSend), hex(alice.sessionIdRecv));
});

// ---------------------------------------------------------------------------
// AAD mismatch must fail
// ---------------------------------------------------------------------------

test("SecureChannel: AAD mismatch must fail", () => {
  const sharedSecret = random32();
  const baseContext = "test/secure-channel/aad-mismatch";

  const alice = new SecureChannel({ sharedSecret, baseContext, role: "alice" });
  const bob = new SecureChannel({ sharedSecret, baseContext, role: "bob" });

  const out = alice.encryptToPeer("Test", "AAD1");

  const dec = bob.decryptFromPeer(out.nonce, out.ciphertext, out.tag, "AAD2");
  assert.equal(dec, null);
});

// ---------------------------------------------------------------------------
// Nonce mismatch must fail
// ---------------------------------------------------------------------------

test("SecureChannel: nonce mismatch must fail", () => {
  const sharedSecret = random32();
  const baseContext = "test/secure-channel/nonce-mismatch";

  const alice = new SecureChannel({ sharedSecret, baseContext, role: "alice" });
  const bob = new SecureChannel({ sharedSecret, baseContext, role: "bob" });

  const out = alice.encryptToPeer("Test", "AAD");

  const wrongNonce = new Uint8Array(out.nonce);
  wrongNonce[11] ^= 1; // flip last byte

  const dec = bob.decryptFromPeer(wrongNonce, out.ciphertext, out.tag, "AAD");
  assert.equal(dec, null);
});

// ---------------------------------------------------------------------------
// baseContext mismatch must fail
// ---------------------------------------------------------------------------

test("SecureChannel: baseContext mismatch must fail", () => {
  const sharedSecret = random32();

  const alice = new SecureChannel({
    sharedSecret,
    baseContext: "ctx1",
    role: "alice",
  });

  const bob = new SecureChannel({
    sharedSecret,
    baseContext: "ctx2",
    role: "bob",
  });

  const out = alice.encryptToPeer("Test", "AAD");

  const dec = bob.decryptFromPeer(out.nonce, out.ciphertext, out.tag, "AAD");
  assert.equal(dec, null);
});