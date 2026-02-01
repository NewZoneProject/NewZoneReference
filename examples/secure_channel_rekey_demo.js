// ============================================================================
// SecureChannel rekey demo (Alice ↔ Bob)
//
// This demo shows:
//   - A shared secret (simulated here as random bytes)
//   - SecureChannel usage
//   - Rekeying after some messages
//
// Run: node examples/secure_channel_rekey_demo.js
//
// File: examples/secure_channel_rekey_demo.js
// ============================================================================

const crypto = require("crypto");
const { SecureChannel } = require("../lib/secureChannel.js");

function hex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

function main() {
  console.log("=== SecureChannel rekey demo (Alice ↔ Bob) ===");

  // In a real protocol this would come from X25519 handshake.
  const sharedSecret = crypto.randomBytes(32);
  const baseContext = "NZ-CRYPTO-02/example/secure-channel-rekey/v1";

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

  console.log("\nInitial session IDs:");
  console.log("Alice send:", hex(alice.sessionIdSend));
  console.log("Alice recv:", hex(alice.sessionIdRecv));
  console.log("Bob   send:", hex(bob.sessionIdSend));
  console.log("Bob   recv:", hex(bob.sessionIdRecv));

  // 1) Alice → Bob before rekey
  const msg1 = "Message #1 before rekey";
  const out1 = alice.encryptToPeer(msg1, "AAD-1");
  const dec1 = bob.decryptFromPeer(out1.nonce, out1.ciphertext, out1.tag, "AAD-1");
  if (!dec1) throw new Error("Decrypt #1 failed");
  console.log("\n[epoch 0] Alice → Bob:", Buffer.from(dec1).toString());

  // 2) Rekey on both sides
  console.log("\nRekeying both sides...");
  alice.rekey();
  bob.rekey();

  console.log("\nAfter rekey session IDs:");
  console.log("Alice send:", hex(alice.sessionIdSend));
  console.log("Alice recv:", hex(alice.sessionIdRecv));
  console.log("Bob   send:", hex(bob.sessionIdSend));
  console.log("Bob   recv:", hex(bob.sessionIdRecv));

  // 3) Alice → Bob after rekey
  const msg2 = "Message #2 after rekey";
  const out2 = alice.encryptToPeer(msg2, "AAD-2");
  const dec2 = bob.decryptFromPeer(out2.nonce, out2.ciphertext, out2.tag, "AAD-2");
  if (!dec2) throw new Error("Decrypt #2 failed");
  console.log("\n[epoch 1] Alice → Bob:", Buffer.from(dec2).toString());

  console.log("\nSecureChannel rekey demo: OK");
}

if (require.main === module) {
  main();
}

module.exports = { main };