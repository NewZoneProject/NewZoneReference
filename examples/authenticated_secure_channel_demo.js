// ============================================================================
// Authenticated SecureChannel demo (Alice ↔ Bob)
//
// This demo shows:
//   - Ed25519 identity keys for Alice and Bob (seed + raw pubkey)
//   - Authenticated X25519 handshake (handshake.js)
//   - Shared secret agreement
//   - SecureChannel usage on top of the shared secret
//
// Run: node examples/authenticated_secure_channel_demo.js
//
// File: examples/authenticated_secure_channel_demo.js
// ============================================================================

const crypto = require("crypto");
const {
  aliceStartHandshake,
  bobRespondHandshake,
  aliceFinishHandshake,
} = require("../lib/handshake.js");
const { SecureChannel } = require("../lib/secureChannel.js");
const { ed25519GetPublicKey } = require("../lib/ed25519.js");

function hex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

function main() {
  console.log("=== Authenticated SecureChannel demo (Alice ↔ Bob) ===");

  // 1) Generate Ed25519 identity seeds (32 bytes) and public keys (32 bytes)
  const aliceSeed = crypto.randomBytes(32);
  const bobSeed = crypto.randomBytes(32);

  const aliceIdentityPub = ed25519GetPublicKey(aliceSeed);
  const bobIdentityPub = ed25519GetPublicKey(bobSeed);

  console.log("Alice identity pk:", hex(aliceIdentityPub).slice(0, 32), "...");
  console.log("Bob   identity pk:", hex(bobIdentityPub).slice(0, 32), "...");

  // 2) Alice starts handshake (uses Ed25519 seed as identity private key)
  const aliceHello = aliceStartHandshake(aliceSeed);
  console.log("\nAlice ephemeral pub:", hex(aliceHello.aliceEphemeralPub));

  // 3) Bob responds to AliceHello
  const bobResp = bobRespondHandshake({
    aliceEphemeralPub: aliceHello.aliceEphemeralPub,
    aliceSig: aliceHello.aliceSig,
    aliceIdentityPublicKey: aliceIdentityPub,
    bobIdentityPrivateSeed: bobSeed,
  });

  if (!bobResp.ok) {
    throw new Error("Bob handshake failed: " + bobResp.error);
  }

  console.log("Bob ephemeral pub  :", hex(bobResp.bobEphemeralPub));

  // 4) Alice finishes handshake with BobHello
  const aliceFin = aliceFinishHandshake({
    aliceEphemeralSecret: aliceHello.aliceEphemeralSecret,
    bobEphemeralPub: bobResp.bobEphemeralPub,
    bobSig: bobResp.bobSig,
    bobIdentityPublicKey: bobIdentityPub,
  });

  if (!aliceFin.ok) {
    throw new Error("Alice handshake failed: " + aliceFin.error);
  }

  const sharedAlice = aliceFin.sharedSecretAlice;
  const sharedBob = bobResp.sharedSecretBob;

  console.log("\nShared (Alice):", hex(sharedAlice));
  console.log("Shared (Bob)  :", hex(sharedBob));

  if (hex(sharedAlice) !== hex(sharedBob)) {
    throw new Error("Shared secret mismatch after authenticated handshake");
  }

  const sharedSecret = sharedAlice;
  const baseContext = "NZ-CRYPTO-02/example/auth-secure-channel/v1";

  // 5) Create SecureChannel instances for both sides
  const aliceChannel = new SecureChannel({
    sharedSecret,
    baseContext,
    role: "alice",
  });

  const bobChannel = new SecureChannel({
    sharedSecret,
    baseContext,
    role: "bob",
  });

  console.log("\nSession IDs:");
  console.log("Alice send:", hex(aliceChannel.sessionIdSend));
  console.log("Alice recv:", hex(aliceChannel.sessionIdRecv));
  console.log("Bob   send:", hex(bobChannel.sessionIdSend));
  console.log("Bob   recv:", hex(bobChannel.sessionIdRecv));

  // 6) Alice → Bob over authenticated SecureChannel
  const msgAB = "Hello Bob, this is Alice over AUTHENTICATED SecureChannel";
  const outAB = aliceChannel.encryptToPeer(msgAB, "AAD-Alice->Bob");

  console.log("\nAlice → Bob");
  console.log("nonce     :", hex(outAB.nonce));
  console.log("ciphertext:", hex(outAB.ciphertext));
  console.log("tag       :", hex(outAB.tag));

  const decAB = bobChannel.decryptFromPeer(
    outAB.nonce,
    outAB.ciphertext,
    outAB.tag,
    "AAD-Alice->Bob"
  );
  if (!decAB) throw new Error("Alice→Bob decrypt failed");
  console.log("decrypted :", Buffer.from(decAB).toString());

  // 7) Bob → Alice over authenticated SecureChannel
  const msgBA = "Hello Alice, Bob confirms: handshake is authenticated.";
  const outBA = bobChannel.encryptToPeer(msgBA, "AAD-Bob->Alice");

  console.log("\nBob → Alice");
  console.log("nonce     :", hex(outBA.nonce));
  console.log("ciphertext:", hex(outBA.ciphertext));
  console.log("tag       :", hex(outBA.tag));

  const decBA = aliceChannel.decryptFromPeer(
    outBA.nonce,
    outBA.ciphertext,
    outBA.tag,
    "AAD-Bob->Alice"
  );
  if (!decBA) throw new Error("Bob→Alice decrypt failed");
  console.log("decrypted :", Buffer.from(decBA).toString());

  console.log("\nAuthenticated SecureChannel demo: OK");
}

if (require.main === module) {
  main();
}

module.exports = { main };