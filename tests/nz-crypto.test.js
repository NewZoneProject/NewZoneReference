// NewZone — full crypto test suite (pure X25519 version)
// Run: node tests/nz-crypto.test.js

import { nzCrypto } from '../lib/nz-crypto.js';
import '../lib/nz-crypto-adapter-pure.js';

import {
  deriveMasterSecret,
  deriveSeedKey,
  deriveSeedKeyFromMnemonic,
  buildSignedPacket,
  verifySignedPacket,
  deriveSessionKey,
  encryptPacket,
  decryptPacket
} from '../lib/nz-crypto.js';

import {
  x25519GetPublicKey,
  x25519GetSharedSecret
} from '../lib/x25519/x25519.js';

function log(title) {
  console.log('\n--- ' + title + ' ---');
}

(async () => {
  try {
    const mnemonic =
      "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu " +
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
    // 4. Pure X25519 test (direct)
    // ------------------------------------------------------------
    log("Pure X25519 test (direct)");

    const seedX = await deriveSeedKey(master, "id:test:x25519");
    const privA = new Uint8Array(seedX);
    const pubA = x25519GetPublicKey(privA);

    const privB = new Uint8Array(seedX.map((x, i) => x ^ 0x55)); // pseudo-second key
    const pubB = x25519GetPublicKey(privB);

    const sharedAB = x25519GetSharedSecret(privA, pubB);
    const sharedBA = x25519GetSharedSecret(privB, pubA);

    console.log("sharedAB == sharedBA:", sharedAB.toString() === sharedBA.toString());

    // ------------------------------------------------------------
    // 5. deriveSessionKey (uses pure X25519)
    // ------------------------------------------------------------
    log("deriveSessionKey (pure X25519)");

    const xKey = await nzCrypto.x25519.importPrivateKey(seedX);

    const sessionKey = await deriveSessionKey({
      ourPrivX25519: xKey.privateKey,
      theirPubX25519: xKey.publicKey
    });

    console.log("sessionKey:", sessionKey.length, "bytes");

    // ------------------------------------------------------------
    // 6. Encrypt + decrypt packet
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
    // 7. Full SEED → key chain
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