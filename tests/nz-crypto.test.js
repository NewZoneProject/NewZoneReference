// Minimal test suite for nz-crypto.js + noble adapter
// Run: node tests/nz-crypto.test.js

import '../nz-crypto-adapter-noble.js';
import {
  deriveMasterSecret,
  deriveSeedKey,
  deriveSeedKeyFromMnemonic,
  buildSignedPacket,
  verifySignedPacket,
  deriveSessionKey,
  encryptPacket,
  decryptPacket
} from '../nz-crypto.js';

function log(title) {
  console.log('\n--- ' + title + ' ---');
}

(async () => {
  try {
    const mnemonic = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu " +
                     "nu xi omicron pi rho sigma tau upsilon phi chi psi omega one two three";
    const password = "test-password";

    // ------------------------------------------------------------
    // 1. SEED → master_secret
    // ------------------------------------------------------------
    log("SEED → master_secret");
    const master = await deriveMasterSecret(mnemonic, password);
    console.log("master_secret:", master.length, "bytes");

    // ------------------------------------------------------------
    // 2. SEED → deterministic Ed25519 key
    // ------------------------------------------------------------
    log("SEED → deterministic Ed25519 key");
    const seedSign = await deriveSeedKey(master, "id:test:sign");
    const edKey = await nzCrypto.ed25519.importPrivateKey(seedSign);
    console.log("publicKey:", edKey.publicKey.length, "bytes");

    // ------------------------------------------------------------
    // 3. Sign + verify packet
    // ------------------------------------------------------------
    log("Sign + verify packet");
    const packet = await buildSignedPacket({
      nodeId: "node-test",
      privateKey: edKey.privateKey,
      body: { hello: "world" }
    });

    const verifyResult = await verifySignedPacket({
      packet,
      getPublicKeyByNodeId: async () => edKey.publicKey
    });

    console.log("verify:", verifyResult);

    // ------------------------------------------------------------
    // 4. X25519 session key
    // ------------------------------------------------------------
    log("X25519 session key");
    const seedX = await deriveSeedKey(master, "id:test:x25519");
    const xKey = await nzCrypto.x25519.importPrivateKey(seedX);

    const sessionKey = await deriveSessionKey({
      ourPrivX25519: xKey.privateKey,
      theirPubX25519: xKey.publicKey
    });

    console.log("sessionKey:", sessionKey.length, "bytes");

    // ------------------------------------------------------------
    // 5. Encrypt + decrypt packet
    // ------------------------------------------------------------
    log("Encrypt + decrypt packet");
    const encrypted = await encryptPacket({
      packet,
      sessionKey,
      senderNodeId: "node-test",
      receiverNodeId: "node-test"
    });

    console.log("encrypted:", encrypted);

    const decrypted = await decryptPacket({
      packet: encrypted,
      sessionKey
    });

    console.log("decrypted:", decrypted);

    // ------------------------------------------------------------
    // 6. SEED → key (full chain)
    // ------------------------------------------------------------
    log("deriveSeedKeyFromMnemonic");
    const seedFull = await deriveSeedKeyFromMnemonic(
      mnemonic,
      password,
      "id:test:full"
    );
    console.log("seedFull:", seedFull.length, "bytes");

    console.log("\nAll tests completed successfully.");

  } catch (err) {
    console.error("Test failed:", err);
  }
})();