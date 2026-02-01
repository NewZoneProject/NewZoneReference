// ============================================================================
// nz_crypto_rfc.test.js
// RFC-grade test suite for lib/nz-crypto.js (facade + high-level helpers)
// Run: node --test tests/nz_crypto_rfc.test.js
// ============================================================================

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const {
  nzCrypto,
  buildSignedPacket,
  verifySignedPacket,
  encryptPacket,
  decryptPacket,
} = require("../lib/nz-crypto.js");

function hex(u8) {
  return Buffer.from(u8).toString("hex");
}
function u8(buf) {
  return new Uint8Array(buf);
}

// ---------------------------------------------------------------------------
// GROUP 1 — Ed25519 via facade
// ---------------------------------------------------------------------------

test("ed25519: generate keypair and sign/verify via nzCrypto", () => {
  const seed = crypto.randomBytes(32);
  const { privateKey, publicKey } = nzCrypto.ed25519.importPrivateKey(u8(seed));

  assert.equal(privateKey.length, 32);
  assert.equal(publicKey.length, 32);

  const msg = Buffer.from("hello ed25519 via facade");
  const sig = nzCrypto.ed25519.sign(msg, privateKey);

  assert.equal(sig.length, 64);
  assert.ok(nzCrypto.ed25519.verify(msg, sig, publicKey));
  assert.ok(!nzCrypto.ed25519.verify(Buffer.from("other"), sig, publicKey));
});

test("ed25519: deterministic signatures for same key+message", () => {
  const seed = crypto.randomBytes(32);
  const { privateKey } = nzCrypto.ed25519.importPrivateKey(u8(seed));
  const msg = Buffer.from("deterministic");

  const s1 = nzCrypto.ed25519.sign(msg, privateKey);
  const s2 = nzCrypto.ed25519.sign(msg, privateKey);

  assert.equal(hex(s1), hex(s2));
});

// ---------------------------------------------------------------------------
// GROUP 2 — X25519 via facade
// ---------------------------------------------------------------------------

test("x25519: key agreement symmetry via nzCrypto", () => {
  const aSeed = crypto.randomBytes(32);
  const bSeed = crypto.randomBytes(32);

  const a = nzCrypto.x25519.importPrivateKey(u8(aSeed));
  const b = nzCrypto.x25519.importPrivateKey(u8(bSeed));

  const sharedAB = nzCrypto.x25519.x25519(a.privateKey, b.publicKey);
  const sharedBA = nzCrypto.x25519.x25519(b.privateKey, a.publicKey);

  assert.equal(sharedAB.length, 32);
  assert.equal(sharedBA.length, 32);
  assert.equal(hex(sharedAB), hex(sharedBA));
});

// ---------------------------------------------------------------------------
// GROUP 3 — HKDF via facade
// ---------------------------------------------------------------------------

test("hkdf: length and separation by salt/info", () => {
  const ikm = u8(crypto.randomBytes(32));
  const salt1 = nzCrypto.blake2b(Buffer.from("salt1"), 32);
  const salt2 = nzCrypto.blake2b(Buffer.from("salt2"), 32);

  const info1 = Buffer.from("info1");
  const info2 = Buffer.from("info2");

  const k1 = nzCrypto.hkdf("sha512", salt1, ikm, info1, 32);
  const k2 = nzCrypto.hkdf("sha512", salt1, ikm, info2, 32);
  const k3 = nzCrypto.hkdf("sha512", salt2, ikm, info1, 32);

  assert.equal(k1.length, 32);
  assert.equal(k2.length, 32);
  assert.equal(k3.length, 32);

  assert.notEqual(hex(k1), hex(k2));
  assert.notEqual(hex(k1), hex(k3));
});

// ---------------------------------------------------------------------------
// GROUP 4 — ChaCha20-Poly1305 AEAD via facade
// ---------------------------------------------------------------------------

test("aead: encrypt/decrypt roundtrip with AAD", () => {
  const key = u8(crypto.randomBytes(32));
  const nonce = u8(crypto.randomBytes(12));
  const aad = Buffer.from("aad:nz-crypto");
  const plaintext = Buffer.from("hello secure world");

  const { ciphertext, tag } = nzCrypto.aead.encrypt(
    key,
    nonce,
    u8(plaintext),
    u8(aad)
  );

  const decrypted = nzCrypto.aead.decrypt(
    key,
    nonce,
    ciphertext,
    tag,
    u8(aad)
  );

  assert.equal(Buffer.from(decrypted).toString("utf8"), plaintext.toString("utf8"));
});

test("aead: decryption fails on modified ciphertext", () => {
  const key = u8(crypto.randomBytes(32));
  const nonce = u8(crypto.randomBytes(12));
  const aad = Buffer.from("aad:nz-crypto");
  const plaintext = Buffer.from("hello secure world");

  const { ciphertext, tag } = nzCrypto.aead.encrypt(
    key,
    nonce,
    u8(plaintext),
    u8(aad)
  );

  const corrupted = new Uint8Array(ciphertext);
  corrupted[0] ^= 0xff;

  const out = nzCrypto.aead.decrypt(
    key,
    nonce,
    corrupted,
    tag,
    u8(aad)
  );

  assert.equal(out, null, "decrypt must return null on authentication failure");
});

// ---------------------------------------------------------------------------
// GROUP 5 — High-level: deriveSessionKey
// ---------------------------------------------------------------------------

test("highLevel.deriveSessionKey: symmetric and 32 bytes", () => {
  const aSeed = crypto.randomBytes(32);
  const bSeed = crypto.randomBytes(32);

  const a = nzCrypto.x25519.importPrivateKey(u8(aSeed));
  const b = nzCrypto.x25519.importPrivateKey(u8(bSeed));

  const context = "NZ-CRYPTO-01/session";

  const kA = nzCrypto.highLevel.deriveSessionKey({
    ourPrivX25519: a.privateKey,
    theirPubX25519: b.publicKey,
    context,
  });

  const kB = nzCrypto.highLevel.deriveSessionKey({
    ourPrivX25519: b.privateKey,
    theirPubX25519: a.publicKey,
    context,
  });

  assert.equal(kA.length, 32);
  assert.equal(kB.length, 32);
  assert.equal(hex(kA), hex(kB));
});

// ---------------------------------------------------------------------------
// GROUP 6 — High-level: buildSignedPacket / verifySignedPacket
// ---------------------------------------------------------------------------

test("highLevel: buildSignedPacket + verifySignedPacket roundtrip", async () => {
  const seed = crypto.randomBytes(32);
  const { privateKey, publicKey } = nzCrypto.ed25519.importPrivateKey(u8(seed));

  const nodeId = "nzid:node:test-node";
  const body = { action: "ping", payload: { value: 42 } };

  const packet = await buildSignedPacket({ nodeId, privateKey, body });

  const seenNonces = new Set();

  async function getPublicKeyByNodeId(id) {
    if (id === nodeId) return publicKey;
    return null;
  }

  async function isNonceSeen(id, nonce) {
    const key = `${id}:${nonce}`;
    if (seenNonces.has(key)) return true;
    seenNonces.add(key);
    return false;
  }

  const res1 = await verifySignedPacket({
    packet,
    getPublicKeyByNodeId,
    isNonceSeen,
  });

  assert.equal(res1.ok, true);
  assert.equal(res1.node_id, nodeId);

  const res2 = await verifySignedPacket({
    packet,
    getPublicKeyByNodeId,
    isNonceSeen,
  });

  assert.equal(res2.ok, false);
  assert.equal(res2.reason, "replay_nonce");
});

test("highLevel: verifySignedPacket fails on body tampering", async () => {
  const seed = crypto.randomBytes(32);
  const { privateKey, publicKey } = nzCrypto.ed25519.importPrivateKey(u8(seed));

  const nodeId = "nzid:node:test-node";
  const body = { action: "ping", payload: { value: 42 } };

  const packet = await buildSignedPacket({ nodeId, privateKey, body });

  const tampered = {
    auth: { ...packet.auth },
    body: { action: "ping", payload: { value: 43 } },
  };

  async function getPublicKeyByNodeId(id) {
    if (id === nodeId) return publicKey;
    return null;
  }

  const res = await verifySignedPacket({
    packet: tampered,
    getPublicKeyByNodeId,
  });

  assert.equal(res.ok, false);
  assert.equal(res.reason, "body_hash_mismatch");
});

// ---------------------------------------------------------------------------
// GROUP 7 — High-level: encryptPacket / decryptPacket
// ---------------------------------------------------------------------------

test("highLevel: encryptPacket + decryptPacket roundtrip", () => {
  const aSeed = crypto.randomBytes(32);
  const bSeed = crypto.randomBytes(32);

  const a = nzCrypto.x25519.importPrivateKey(u8(aSeed));
  const b = nzCrypto.x25519.importPrivateKey(u8(bSeed));

  const sessionKey = nzCrypto.highLevel.deriveSessionKey({
    ourPrivX25519: a.privateKey,
    theirPubX25519: b.publicKey,
    context: "NZ-CRYPTO-01/packet-session",
  });

  const innerPacket = {
    auth: {
      node_id: "nzid:node:a",
      timestamp: Math.floor(Date.now() / 1000),
      nonce: "nonce-123",
      body_hash: "dummy",
      signature: "dummy",
    },
    body: { action: "secure", payload: { ok: true } },
  };

  const encrypted = encryptPacket({
    packet: innerPacket,
    sessionKey,
    senderNodeId: "nzid:node:a",
    receiverNodeId: "nzid:node:b",
  });

  const decrypted = decryptPacket({
    packet: encrypted,
    sessionKey,
  });

  assert.deepEqual(decrypted, innerPacket);
});

test("highLevel: decryptPacket fails on wrong session key", () => {
  const aSeed = crypto.randomBytes(32);
  const bSeed = crypto.randomBytes(32);
  const cSeed = crypto.randomBytes(32);

  const a = nzCrypto.x25519.importPrivateKey(u8(aSeed));
  const b = nzCrypto.x25519.importPrivateKey(u8(bSeed));
  const c = nzCrypto.x25519.importPrivateKey(u8(cSeed));

  const sessionKeyAB = nzCrypto.highLevel.deriveSessionKey({
    ourPrivX25519: a.privateKey,
    theirPubX25519: b.publicKey,
    context: "NZ-CRYPTO-01/packet-session",
  });

  const sessionKeyAC = nzCrypto.highLevel.deriveSessionKey({
    ourPrivX25519: a.privateKey,
    theirPubX25519: c.publicKey,
    context: "NZ-CRYPTO-01/packet-session",
  });

  const innerPacket = {
    auth: {
      node_id: "nzid:node:a",
      timestamp: Math.floor(Date.now() / 1000),
      nonce: "nonce-123",
      body_hash: "dummy",
      signature: "dummy",
    },
    body: { action: "secure", payload: { ok: true } },
  };

  const encrypted = encryptPacket({
    packet: innerPacket,
    sessionKey: sessionKeyAB,
    senderNodeId: "nzid:node:a",
    receiverNodeId: "nzid:node:b",
  });

  assert.throws(() => {
    decryptPacket({
      packet: encrypted,
      sessionKey: sessionKeyAC,
    });
  });
});