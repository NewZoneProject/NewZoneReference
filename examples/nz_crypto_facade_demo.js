// ============================================================================
// NZ-CRYPTO FACADE DEMO
// Full protocol demonstration using the unified nzCrypto facade.
//
// Steps:
//   1) Derive seed keys from mnemonic + password
//   2) Build Ed25519 and X25519 keypairs
//   3) Perform authenticated handshake (Alice ↔ Bob)
//   4) Establish SecureChannel
//   5) Exchange encrypted messages
//
// Run:
//   node examples/nz_crypto_facade_demo.js
// ============================================================================

const { nzCrypto } = require("../lib/nz-crypto.js");

function hex(u8) {
  return Buffer.from(u8).toString("hex");
}

async function main() {
  console.log("=== NZ-CRYPTO FACADE DEMO ===");

  // -------------------------------------------------------------------------
  // 1) SEED → masterSecret → seedKey
  // -------------------------------------------------------------------------
  const mnemonic = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu";
  const password = "demo-password";

  const master = nzCrypto.seed.deriveMasterSecret(mnemonic, password);
  const seedEd = nzCrypto.seed.deriveSeedKey(master, "ed25519/identity");
  const seedX = nzCrypto.seed.deriveSeedKey(master, "x25519/identity");

  console.log("\nMaster secret:", hex(master));
  console.log("Ed25519 seed :", hex(seedEd));
  console.log("X25519 seed  :", hex(seedX));

  // -------------------------------------------------------------------------
  // 2) Build Ed25519 and X25519 keypairs
  // -------------------------------------------------------------------------
  const aliceEd = nzCrypto.ed25519.importPrivateKey(seedEd);
  const aliceX = nzCrypto.x25519.importPrivateKey(seedX);

  const bobEd = nzCrypto.ed25519.generateKeyPair();
  const bobX = nzCrypto.x25519.generateKeyPair();

  console.log("\nAlice Ed25519 pub:", hex(aliceEd.publicKey));
  console.log("Bob   Ed25519 pub:", hex(bobEd.publicKey));

  // -------------------------------------------------------------------------
  // 3) Authenticated handshake
  // -------------------------------------------------------------------------
  const aliceHello = nzCrypto.handshake.aliceStartHandshake(aliceEd.privateKey);

  const bobResp = nzCrypto.handshake.bobRespondHandshake({
    aliceEphemeralPub: aliceHello.aliceEphemeralPub,
    aliceSig: aliceHello.aliceSig,
    aliceIdentityPublicKey: aliceEd.publicKey,
    bobIdentityPrivateSeed: bobEd.privateKey,
  });

  if (!bobResp.ok) throw new Error("Bob handshake failed: " + bobResp.error);

  const aliceFin = nzCrypto.handshake.aliceFinishHandshake({
    aliceEphemeralSecret: aliceHello.aliceEphemeralSecret,
    bobEphemeralPub: bobResp.bobEphemeralPub,
    bobSig: bobResp.bobSig,
    bobIdentityPublicKey: bobEd.publicKey,
  });

  if (!aliceFin.ok) throw new Error("Alice handshake failed: " + aliceFin.error);

  const sharedAlice = aliceFin.sharedSecretAlice;
  const sharedBob = bobResp.sharedSecretBob;

  console.log("\nShared (Alice):", hex(sharedAlice));
  console.log("Shared (Bob)  :", hex(sharedBob));

  if (hex(sharedAlice) !== hex(sharedBob)) {
    throw new Error("Shared secret mismatch");
  }

  // -------------------------------------------------------------------------
  // 4) SecureChannel
  // -------------------------------------------------------------------------
  const baseContext = "NZ-CRYPTO-02/facade-demo/v1";

  const aliceChannel = new nzCrypto.SecureChannel({
    sharedSecret: sharedAlice,
    baseContext,
    role: "alice",
  });

  const bobChannel = new nzCrypto.SecureChannel({
    sharedSecret: sharedBob,
    baseContext,
    role: "bob",
  });

  console.log("\nSession IDs:");
  console.log("Alice send:", hex(aliceChannel.sessionIdSend));
  console.log("Alice recv:", hex(aliceChannel.sessionIdRecv));
  console.log("Bob   send:", hex(bobChannel.sessionIdSend));
  console.log("Bob   recv:", hex(bobChannel.sessionIdRecv));

  // -------------------------------------------------------------------------
  // 5) Encrypted exchange
  // -------------------------------------------------------------------------
  const msgAB = "Hello Bob, this is Alice via nzCrypto facade";
  const outAB = aliceChannel.encryptToPeer(msgAB, "AAD-Alice->Bob");

  console.log("\nAlice → Bob ciphertext:", hex(outAB.ciphertext));

  const decAB = bobChannel.decryptFromPeer(
    outAB.nonce,
    outAB.ciphertext,
    outAB.tag,
    "AAD-Alice->Bob"
  );

  console.log("Bob decrypted:", Buffer.from(decAB).toString());

  const msgBA = "Hello Alice, Bob confirms facade works.";
  const outBA = bobChannel.encryptToPeer(msgBA, "AAD-Bob->Alice");

  console.log("\nBob → Alice ciphertext:", hex(outBA.ciphertext));

  const decBA = aliceChannel.decryptFromPeer(
    outBA.nonce,
    outBA.ciphertext,
    outBA.tag,
    "AAD-Bob->Alice"
  );

  console.log("Alice decrypted:", Buffer.from(decBA).toString());

  console.log("\nNZ-CRYPTO FACADE DEMO: OK");
}

main();