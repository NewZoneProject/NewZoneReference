// ============================================================================
// NewZone — full crypto integration test suite
// Pure Ed25519 + pure X25519 + SEED + packets
// Run: node --test tests/nz-crypto.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import nz from "../lib/nz-crypto.js";
import "../lib/nz-crypto-adapter-pure.js";

const {
  nzCrypto,
  deriveMasterSecret,
  deriveSeedKey,
  deriveSeedKeyFromMnemonic,
  buildSignedPacket,
  verifySignedPacket,
  deriveSessionKey,
  encryptPacket,
  decryptPacket,
} = nz;

import { x25519, x25519Base } from "../lib/x25519.js";

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const mnemonic =
  "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu " +
  "nu xi omicron pi rho sigma tau upsilon phi chi psi omega one two three";

const password = "test-password";

// ---------------------------------------------------------------------------
// 1. SEED → master_secret
// ---------------------------------------------------------------------------

test("nz-crypto: deriveMasterSecret", async () => {
  const master = await deriveMasterSecret(mnemonic, password);
  assert.equal(master.length, 32);
});

// ---------------------------------------------------------------------------
// 2. SEED → deterministic Ed25519 key
// ---------------------------------------------------------------------------

test("nz-crypto: deterministic Ed25519 key from SEED", async () => {
  const master = await deriveMasterSecret(mnemonic, password);
  const seedSign = await deriveSeedKey(master, "id:test:sign");

  const edKey = await nzCrypto.ed25519.importPrivateKey(seedSign);

  assert.equal(edKey.privateKey.length, 32);
  assert.equal(edKey.publicKey.length, 32);
});

// ---------------------------------------------------------------------------
// 3. Sign + verify packet
// ---------------------------------------------------------------------------

test("nz-crypto: buildSignedPacket + verifySignedPacket", async () => {
  const master = await deriveMasterSecret(mnemonic, password);
  const seedSign = await deriveSeedKey(master, "id:test:sign");
  const edKey = await nzCrypto.ed25519.importPrivateKey(seedSign);

  const packet = await buildSignedPacket({
    nodeId: "node-test",
    privateKey: edKey.privateKey,
    body: { hello: "world" },
  });

  const verifyResult = await verifySignedPacket({
    packet,
    getPublicKeyByNodeId: async () => edKey.publicKey,
  });

  assert.equal(verifyResult.ok, true);
  assert.equal(verifyResult.node_id, "node-test");
});

// ---------------------------------------------------------------------------
// 4. Pure X25519 test (direct)
// ---------------------------------------------------------------------------

test("nz-crypto: pure X25519 key agreement", async () => {
  const master = await deriveMasterSecret(mnemonic, password);
  const seedX = await deriveSeedKey(master, "id:test:x25519");

  const privA = new Uint8Array(seedX);
  const pubA = x25519Base(privA);

  const privB = new Uint8Array(seedX.map((x) => x ^ 0x55));
  const pubB = x25519Base(privB);

  const sharedAB = x25519(privA, pubB);
  const sharedBA = x25519(privB, pubA);

  assert.equal(
    Buffer.from(sharedAB).toString("hex"),
    Buffer.from(sharedBA).toString("hex")
  );
});

// ---------------------------------------------------------------------------
// 5. deriveSessionKey (pure X25519)
// ---------------------------------------------------------------------------

test("nz-crypto: deriveSessionKey", async () => {
  const master = await deriveMasterSecret(mnemonic, password);
  const seedX = await deriveSeedKey(master, "id:test:x25519");

  const xKey = await nzCrypto.x25519.importPrivateKey(seedX);

  const sessionKey = await deriveSessionKey({
    ourPrivX25519: xKey.privateKey,
    theirPubX25519: xKey.publicKey,
  });

  assert.equal(sessionKey.length, 32);
});

// ---------------------------------------------------------------------------
// 6. Encrypt + decrypt packet
// ---------------------------------------------------------------------------

test("nz-crypto: encryptPacket + decryptPacket", async () => {
  const master = await deriveMasterSecret(mnemonic, password);
  const seedSign = await deriveSeedKey(master, "id:test:sign");
  const seedX = await deriveSeedKey(master, "id:test:x25519");

  const edKey = await nzCrypto.ed25519.importPrivateKey(seedSign);
  const xKey = await nzCrypto.x25519.importPrivateKey(seedX);

  const packet = await buildSignedPacket({
    nodeId: "node-test",
    privateKey: edKey.privateKey,
    body: { hello: "world" },
  });

  const sessionKey = await deriveSessionKey({
    ourPrivX25519: xKey.privateKey,
    theirPubX25519: xKey.publicKey,
  });

  const encrypted = await encryptPacket({
    packet,
    sessionKey,
    senderNodeId: "node-test",
    receiverNodeId: "node-test",
  });

  const decrypted = await decryptPacket({
    packet: encrypted,
    sessionKey,
  });

  assert.deepEqual(decrypted.body, { hello: "world" });
});

// ---------------------------------------------------------------------------
// 7. Full SEED → key chain
// ---------------------------------------------------------------------------

test("nz-crypto: deriveSeedKeyFromMnemonic", async () => {
  const seedFull = await deriveSeedKeyFromMnemonic(
    mnemonic,
    password,
    "id:test:full"
  );

  assert.equal(seedFull.length, 32);
});