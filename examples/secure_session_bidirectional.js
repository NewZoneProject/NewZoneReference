// ============================================================================
// Bidirectional secure session example (Alice ↔ Bob)
// X25519 KEX → HKDF session keys → ChaCha20-Poly1305 AEAD
// Run: node examples/secure_session_bidirectional.js
// ============================================================================

const crypto = require("crypto");
const { x25519, x25519Base } = require("../lib/x25519.js");
const { deriveSessionKeys } = require("../lib/sessionKeys.js");
const { encrypt, decrypt } = require("../lib/chacha20poly1305.js");

function hex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

function makeNonce(nonceBase, counter) {
  const nonce = new Uint8Array(12);
  nonce.set(nonceBase);
  nonce[8] = (counter >>> 24) & 0xff;
  nonce[9] = (counter >>> 16) & 0xff;
  nonce[10] = (counter >>> 8) & 0xff;
  nonce[11] = counter & 0xff;
  return nonce;
}

function main() {
  console.log("=== NewZone bidirectional secure session example ===");

  // 1) X25519 key pairs
  const aliceSecret = crypto.randomBytes(32);
  const bobSecret = crypto.randomBytes(32);

  const alicePub = x25519Base(aliceSecret);
  const bobPub = x25519Base(bobSecret);

  console.log("Alice pub:", hex(alicePub));
  console.log("Bob   pub:", hex(bobPub));

  // 2) Shared secret
  const sharedAlice = x25519(aliceSecret, bobPub);
  const sharedBob = x25519(bobSecret, alicePub);

  if (hex(sharedAlice) !== hex(sharedBob)) {
    throw new Error("X25519 mismatch");
  }

  const sharedSecret = sharedAlice;

  // 3) Base context
  const baseContext = "NZ-CRYPTO-02/example/bidirectional/v1";

  // 4) Two directions (разные контексты → разные ключи)
  const keysAB = deriveSessionKeys({
    sharedSecret,
    context: baseContext + "/alice->bob",
    hash: "sha512",
    keyLength: 32,
  });

  const keysBA = deriveSessionKeys({
    sharedSecret,
    context: baseContext + "/bob->alice",
    hash: "sha512",
    keyLength: 32,
  });

  console.log("\nSession IDs:");
  console.log("Alice→Bob:", hex(keysAB.sessionId));
  console.log("Bob→Alice:", hex(keysBA.sessionId));

  // ВАЖНО:
  // Для каждого направления используем ОДИН ключ (encKey) и на шифрование, и на расшифровку.
  // decKey здесь не используется, он остаётся как отдельное пространство для других схем.

  // 5) Alice → Bob
  const msgAB = Buffer.from("Hello Bob, this is Alice → Bob");
  const aadAB = Buffer.from("AAD-Alice->Bob");

  const nonceAB = makeNonce(keysAB.nonceBase, 1);
  const encAB = encrypt(keysAB.encKey, nonceAB, msgAB, aadAB);

  console.log("\nAlice → Bob");
  console.log("nonce     :", hex(nonceAB));
  console.log("ciphertext:", hex(encAB.ciphertext));
  console.log("tag       :", hex(encAB.tag));

  const decAB = decrypt(keysAB.encKey, nonceAB, encAB.ciphertext, encAB.tag, aadAB);
  if (!decAB) throw new Error("Alice→Bob decrypt failed");
  console.log("decrypted :", Buffer.from(decAB).toString());

  // 6) Bob → Alice
  const msgBA = Buffer.from("Hello Alice, this is Bob → Alice");
  const aadBA = Buffer.from("AAD-Bob->Alice");

  const nonceBA = makeNonce(keysBA.nonceBase, 1);
  const encBA = encrypt(keysBA.encKey, nonceBA, msgBA, aadBA);

  console.log("\nBob → Alice");
  console.log("nonce     :", hex(nonceBA));
  console.log("ciphertext:", hex(encBA.ciphertext));
  console.log("tag       :", hex(encBA.tag));

  const decBA = decrypt(keysBA.encKey, nonceBA, encBA.ciphertext, encBA.tag, aadBA);
  if (!decBA) throw new Error("Bob→Alice decrypt failed");
  console.log("decrypted :", Buffer.from(decBA).toString());

  // 7) Tampering demo (Alice→Bob)
  const tampered = new Uint8Array(encAB.ciphertext);
  tampered[0] ^= 1;
  const fail = decrypt(keysAB.encKey, nonceAB, tampered, encAB.tag, aadAB);

  console.log(
    "\nTampered decrypt:",
    fail === null ? "AUTH FAILED (as expected)" : "UNEXPECTED SUCCESS"
  );

  console.log("\nBidirectional secure session example: OK");
}

if (require.main === module) {
  main();
}

module.exports = { main };