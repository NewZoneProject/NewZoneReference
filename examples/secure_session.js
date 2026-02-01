// ============================================================================
// Secure session example:
// X25519 KEX → HKDF-based session keys → ChaCha20-Poly1305 AEAD
// Run: node examples/secure_session.js
// ============================================================================

const crypto = require("crypto");
const { x25519, x25519Base } = require("../lib/x25519.js");
const { deriveSessionKeys } = require("../lib/sessionKeys.js");
const { encrypt, decrypt } = require("../lib/chacha20poly1305.js");

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function main() {
  console.log("=== NewZone secure session example ===");

  // 1) X25519 key pairs
  const aliceSecret = crypto.randomBytes(32);
  const bobSecret = crypto.randomBytes(32);

  const alicePub = x25519Base(aliceSecret);
  const bobPub = x25519Base(bobSecret);

  console.log("Alice pub:", bytesToHex(alicePub));
  console.log("Bob   pub:", bytesToHex(bobPub));

  // 2) Shared secrets (must match)
  const sharedAlice = x25519(aliceSecret, bobPub);
  const sharedBob = x25519(bobSecret, alicePub);

  console.log("Shared (Alice):", bytesToHex(sharedAlice));
  console.log("Shared (Bob)  :", bytesToHex(sharedBob));

  if (bytesToHex(sharedAlice) !== bytesToHex(sharedBob)) {
    throw new Error("X25519 shared secret mismatch");
  }

  const sharedSecret = sharedAlice;

  // 3) Context: protocol binding (один и тот же для обеих сторон)
  const context = "NZ-CRYPTO-02/example/secure-session/v1";

  // 4) Оба вызывают deriveSessionKeys с ОДИНАКОВЫМ context
  const aliceKeys = deriveSessionKeys({
    sharedSecret,
    context,
    hash: "sha512",
    keyLength: 32,
  });

  const bobKeys = deriveSessionKeys({
    sharedSecret,
    context,
    hash: "sha512",
    keyLength: 32,
  });

  console.log("\nAlice sessionId:", bytesToHex(aliceKeys.sessionId));
  console.log("Bob   sessionId:", bytesToHex(bobKeys.sessionId));

  // 5) Соглашение по ролям:
  // - Alice → Bob: Alice использует encKey, Bob использует decKey
  // - (если нужно обратное направление, можно ввести второй контекст)

  function makeNonce(nonceBase, counter) {
    if (nonceBase.length !== 12) {
      throw new Error("nonceBase must be 12 bytes");
    }
    const nonce = new Uint8Array(12);
    nonce.set(nonceBase);
    nonce[8] = (counter >>> 24) & 0xff;
    nonce[9] = (counter >>> 16) & 0xff;
    nonce[10] = (counter >>> 8) & 0xff;
    nonce[11] = counter & 0xff;
    return nonce;
  }

  const message = Buffer.from("Hello from Alice to Bob over NewZone secure session");
  const aad = Buffer.from("NZ-CRYPTO-02/example/AAD");

  const nonce1 = makeNonce(aliceKeys.nonceBase, 1);
  const enc = encrypt(aliceKeys.encKey, nonce1, message, aad);

  console.log("\nAlice → Bob");
  console.log("nonce1     :", bytesToHex(nonce1));
  console.log("ciphertext :", bytesToHex(enc.ciphertext));
  console.log("tag        :", bytesToHex(enc.tag));

  const dec = decrypt(bobKeys.encKey, nonce1, enc.ciphertext, enc.tag, aad);
  if (dec === null) {
    throw new Error("Decryption failed");
  }

  console.log("decrypted  :", Buffer.from(dec).toString("utf8"));

  // Tampering demo
  const tampered = new Uint8Array(enc.ciphertext);
  tampered[0] ^= 1;
  const decTampered = decrypt(bobKeys.decKey, nonce1, tampered, enc.tag, aad);
  console.log(
    "\nTampered decrypt:",
    decTampered === null ? "AUTH FAILED (as expected)" : "UNEXPECTED SUCCESS"
  );

  console.log("\nSecure session example: OK");
}

if (require.main === module) {
  main();
}

module.exports = { main };