// ============================================================================
// nz-crypto.facade.test.js
// Full integration test for the unified nzCrypto facade.
//
// Run: node --test tests/nz-crypto.facade.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import nz from "../lib/nz-crypto.js";
const { nzCrypto } = nz;

function hex(u8) {
  return Buffer.from(u8).toString("hex");
}

function randomSeed32() {
  const out = new Uint8Array(32);
  crypto.getRandomValues(out);
  return out;
}

// ---------------------------------------------------------------------------
// Test 1 — SEED → Ed25519/X25519 keys
// ---------------------------------------------------------------------------

test("facade: seed → ed25519/x25519 keys", () => {
  const mnemonic = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu";
  const password = "test-pass";

  const master = nzCrypto.seed.deriveMasterSecret(mnemonic, password);
  assert.equal(master.length, 32);

  const seedEd = nzCrypto.seed.deriveSeedKey(master, "ed25519/identity");
  const seedX = nzCrypto.seed.deriveSeedKey(master, "x25519/identity");

  assert.equal(seedEd.length, 32);
  assert.equal(seedX.length, 32);

  const ed = nzCrypto.ed25519.importPrivateKey(seedEd);
  const xk = nzCrypto.x25519.importPrivateKey(seedX);

  assert.equal(ed.publicKey.length, 32);
  assert.equal(ed.privateKey.length, 32);
  assert.equal(xk.publicKey.length, 32);
  assert.equal(xk.privateKey.length, 32);
});

// ---------------------------------------------------------------------------
// Test 2 — Authenticated handshake via facade
// ---------------------------------------------------------------------------

test("facade: authenticated handshake", () => {
  const aliceSeed = randomSeed32();
  const bobSeed = randomSeed32();

  const alicePub = nzCrypto.ed25519.importPrivateKey(aliceSeed).publicKey;
  const bobPub = nzCrypto.ed25519.importPrivateKey(bobSeed).publicKey;

  const hello = nzCrypto.handshake.aliceStartHandshake(aliceSeed);

  const resp = nzCrypto.handshake.bobRespondHandshake({
    aliceEphemeralPub: hello.aliceEphemeralPub,
    aliceSig: hello.aliceSig,
    aliceIdentityPublicKey: alicePub,
    bobIdentityPrivateSeed: bobSeed,
  });

  assert.equal(resp.ok, true);

  const fin = nzCrypto.handshake.aliceFinishHandshake({
    aliceEphemeralSecret: hello.aliceEphemeralSecret,
    bobEphemeralPub: resp.bobEphemeralPub,
    bobSig: resp.bobSig,
    bobIdentityPublicKey: bobPub,
  });

  assert.equal(fin.ok, true);

  assert.equal(
    hex(fin.sharedSecretAlice),
    hex(resp.sharedSecretBob)
  );
});

// ---------------------------------------------------------------------------
// Test 3 — SecureChannel via facade
// ---------------------------------------------------------------------------

test("facade: SecureChannel end-to-end", () => {
  const shared = randomSeed32();
  const baseContext = "test/facade/secure-channel";

  const alice = new nzCrypto.SecureChannel({
    sharedSecret: shared,
    baseContext,
    role: "alice",
  });

  const bob = new nzCrypto.SecureChannel({
    sharedSecret: shared,
    baseContext,
    role: "bob",
  });

  const msg = "Hello Bob via facade";
  const out = alice.encryptToPeer(msg, "AAD");

  const dec = bob.decryptFromPeer(out.nonce, out.ciphertext, out.tag, "AAD");
  assert.equal(Buffer.from(dec).toString(), msg);
});

// ---------------------------------------------------------------------------
// Test 4 — Full protocol: SEED → handshake → SecureChannel → exchange
// ---------------------------------------------------------------------------

test("facade: full protocol flow", () => {
  // 1) SEED
  const mnemonic = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu";
  const password = "full-flow";

  const master = nzCrypto.seed.deriveMasterSecret(mnemonic, password);
  const seedEd = nzCrypto.seed.deriveSeedKey(master, "ed25519/identity");
  const seedX = nzCrypto.seed.deriveSeedKey(master, "x25519/identity");

  const aliceEd = nzCrypto.ed25519.importPrivateKey(seedEd);
  const aliceX = nzCrypto.x25519.importPrivateKey(seedX);

  const bobEd = nzCrypto.ed25519.generateKeyPair();
  const bobX = nzCrypto.x25519.generateKeyPair();

  // 2) Handshake
  const hello = nzCrypto.handshake.aliceStartHandshake(aliceEd.privateKey);

  const resp = nzCrypto.handshake.bobRespondHandshake({
    aliceEphemeralPub: hello.aliceEphemeralPub,
    aliceSig: hello.aliceSig,
    aliceIdentityPublicKey: aliceEd.publicKey,
    bobIdentityPrivateSeed: bobEd.privateKey,
  });

  assert.equal(resp.ok, true);

  const fin = nzCrypto.handshake.aliceFinishHandshake({
    aliceEphemeralSecret: hello.aliceEphemeralSecret,
    bobEphemeralPub: resp.bobEphemeralPub,
    bobSig: resp.bobSig,
    bobIdentityPublicKey: bobEd.publicKey,
  });

  assert.equal(fin.ok, true);

  const sharedAlice = fin.sharedSecretAlice;
  const sharedBob = resp.sharedSecretBob;

  assert.equal(hex(sharedAlice), hex(sharedBob));

  // 3) SecureChannel
  const baseContext = "test/facade/full-protocol";

  const alice = new nzCrypto.SecureChannel({
    sharedSecret: sharedAlice,
    baseContext,
    role: "alice",
  });

  const bob = new nzCrypto.SecureChannel({
    sharedSecret: sharedBob,
    baseContext,
    role: "bob",
  });

  // 4) Exchange
  const msgAB = "Hello Bob, full protocol OK";
  const outAB = alice.encryptToPeer(msgAB, "AAD-AB");

  const decAB = bob.decryptFromPeer(outAB.nonce, outAB.ciphertext, outAB.tag, "AAD-AB");
  assert.equal(Buffer.from(decAB).toString(), msgAB);

  const msgBA = "Hello Alice, full protocol OK";
  const outBA = bob.encryptToPeer(msgBA, "AAD-BA");

  const decBA = alice.decryptFromPeer(outBA.nonce, outBA.ciphertext, outBA.tag, "AAD-BA");
  assert.equal(Buffer.from(decBA).toString(), msgBA);
});