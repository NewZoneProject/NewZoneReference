// ============================================================================
// SecureChannel demo (Alice ↔ Bob)
// Demonstrates:
//   - X25519 key exchange
//   - SecureChannel abstraction
//   - Bidirectional encrypted communication
//
// Run: node examples/secure_channel_demo.js
// ============================================================================

const crypto = require("crypto");
const { x25519, x25519Base } = require("../lib/x25519.js");
const { SecureChannel } = require("../lib/secureChannel.js");

function hex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

function main() {
  console.log("=== SecureChannel demo (Alice ↔ Bob) ===");

  // 1) Generate X25519 key pairs
  const aliceSecret = crypto.randomBytes(32);
  const bobSecret = crypto.randomBytes(32);

  const alicePub = x25519Base(aliceSecret);
  const bobPub = x25519Base(bobSecret);

  console.log("Alice pub:", hex(alicePub));
  console.log("Bob   pub:", hex(bobPub));

  // 2) Compute shared secret
  const sharedAlice = x25519(aliceSecret, bobPub);
  const sharedBob = x25519(bobSecret, alicePub);

  if (hex(sharedAlice) !== hex(sharedBob)) {
    throw new Error("X25519 mismatch");
  }

  const sharedSecret = sharedAlice;

  // 3) Create secure channels for both sides
  const baseContext = "NZ-CRYPTO-02/example/secure-channel/v1";

  const alice = new SecureChannel({
    sharedSecret,
    baseContext,
    role: "alice",
  });

  const bob = new SecureChannel({
    sharedSecret,
    baseContext,
    role: "bob",
  });

  console.log("\nSession IDs:");
  console.log("Alice send:", hex(alice.sessionIdSend));
  console.log("Alice recv:", hex(alice.sessionIdRecv));
  console.log("Bob   send:", hex(bob.sessionIdSend));
  console.log("Bob   recv:", hex(bob.sessionIdRecv));

  // 4) Alice → Bob
  const msgAB = "Hello Bob, this is Alice via SecureChannel";
  const outAB = alice.encryptToPeer(msgAB, "AAD-Alice->Bob");

  console.log("\nAlice → Bob");
  console.log("nonce     :", hex(outAB.nonce));
  console.log("ciphertext:", hex(outAB.ciphertext));
  console.log("tag       :", hex(outAB.tag));

  const decAB = bob.decryptFromPeer(outAB.nonce, outAB.ciphertext, outAB.tag, "AAD-Alice->Bob");
  if (!decAB) throw new Error("Alice→Bob decrypt failed");
  console.log("decrypted :", Buffer.from(decAB).toString());

  // 5) Bob → Alice
  const msgBA = "Hello Alice, Bob here — channel works both ways";
  const outBA = bob.encryptToPeer(msgBA, "AAD-Bob->Alice");

  console.log("\nBob → Alice");
  console.log("nonce     :", hex(outBA.nonce));
  console.log("ciphertext:", hex(outBA.ciphertext));
  console.log("tag       :", hex(outBA.tag));

  const decBA = alice.decryptFromPeer(outBA.nonce, outBA.ciphertext, outBA.tag, "AAD-Bob->Alice");
  if (!decBA) throw new Error("Bob→Alice decrypt failed");
  console.log("decrypted :", Buffer.from(decBA).toString());

  // 6) Tampering demo
  const tampered = new Uint8Array(outAB.ciphertext);
  tampered[0] ^= 1;

  const fail = bob.decryptFromPeer(outAB.nonce, tampered, outAB.tag, "AAD-Alice->Bob");
  console.log(
    "\nTampered decrypt:",
    fail === null ? "AUTH FAILED (as expected)" : "UNEXPECTED SUCCESS"
  );

  console.log("\nSecureChannel demo: OK");
}

if (require.main === module) {
  main();
}

module.exports = { main };