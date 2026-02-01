// ============================================================================
// seed_rfc.test.js
// RFC-grade test suite for mnemonic → master secret → seed keys → crypto keys
// Run: node --test tests/seed_rfc.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

import {
  deriveMasterSecret,
  deriveSeedKey,
  deriveSeedKeyFromMnemonic,
} from "../lib/nz-crypto-seed.js";

import nz from "../lib/nz-crypto.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const WORDLIST = fs
  .readFileSync("./lib/bip-39-english.txt", "utf8")
  .split(/\r?\n/)
  .map((w) => w.trim())
  .filter((w) => w.length > 0);

if (WORDLIST.length !== 2048) {
  throw new Error("bip-39-english.txt must contain exactly 2048 words");
}

function generateMnemonic24() {
  const entropy = crypto.randomBytes(48); // 24 * 2 bytes
  const words = [];
  for (let i = 0; i < 24; i++) {
    const hi = entropy[i * 2];
    const lo = entropy[i * 2 + 1];
    const index = ((hi << 8) | lo) % WORDLIST.length;
    words.push(WORDLIST[index]);
  }
  return words.join(" ");
}

function hex(u8) {
  return Buffer.from(u8).toString("hex");
}

// ---------------------------------------------------------------------------
// GROUP 1 — Mnemonic format & validity
// ---------------------------------------------------------------------------

test("mnemonic: must contain exactly 24 words", () => {
  const m = generateMnemonic24();
  const parts = m.split(" ");
  assert.equal(parts.length, 24);
});

test("mnemonic: all words must be from BIP-39 list", () => {
  const m = generateMnemonic24();
  const parts = m.split(" ");
  for (const w of parts) {
    assert.ok(WORDLIST.includes(w), `invalid word: ${w}`);
  }
});

test("mnemonic: no empty words and no extra spaces", () => {
  const m = generateMnemonic24();
  const parts = m.split(" ");
  for (const w of parts) {
    assert.ok(w.length > 0);
  }
  assert.equal(m.trim(), m, "mnemonic must not have leading/trailing spaces");
});

test("mnemonic: no duplicate adjacent words", () => {
  const m = generateMnemonic24();
  const parts = m.split(" ");
  for (let i = 1; i < parts.length; i++) {
    assert.notEqual(parts[i], parts[i - 1], `duplicate: ${parts[i]}`);
  }
});

// ---------------------------------------------------------------------------
// GROUP 2 — Master secret determinism & separation
// ---------------------------------------------------------------------------

test("master secret: same mnemonic + same password → same master", () => {
  const m = generateMnemonic24();
  const pwd = "password123";
  const m1 = deriveMasterSecret(m, pwd);
  const m2 = deriveMasterSecret(m, pwd);
  assert.equal(hex(m1), hex(m2));
});

test("master secret: same mnemonic + different password → different master", () => {
  const m = generateMnemonic24();
  const m1 = deriveMasterSecret(m, "pass1");
  const m2 = deriveMasterSecret(m, "pass2");
  assert.notEqual(hex(m1), hex(m2));
});

test("master secret: different mnemonic + same password → different master", () => {
  const m1 = generateMnemonic24();
  const m2 = generateMnemonic24();
  const s1 = deriveMasterSecret(m1, "pass");
  const s2 = deriveMasterSecret(m2, "pass");
  assert.notEqual(hex(s1), hex(s2));
});

test("master secret: always 32 bytes", () => {
  const m = generateMnemonic24();
  const s = deriveMasterSecret(m, "pass");
  assert.equal(s.length, 32);
});

// ---------------------------------------------------------------------------
// GROUP 3 — Seed key derivation & paths
// ---------------------------------------------------------------------------

test("seed key: deriveSeedKey returns 32 bytes", () => {
  const m = generateMnemonic24();
  const master = deriveMasterSecret(m, "pass");
  const k1 = deriveSeedKey(master, "ed25519/identity");
  const k2 = deriveSeedKey(master, "x25519/identity");
  assert.equal(k1.length, 32);
  assert.equal(k2.length, 32);
});

test("seed key: different paths → different keys", () => {
  const m = generateMnemonic24();
  const master = deriveMasterSecret(m, "pass");
  const k1 = deriveSeedKey(master, "ed25519/identity");
  const k2 = deriveSeedKey(master, "x25519/identity");
  const k3 = deriveSeedKey(master, "session/1");
  const k4 = deriveSeedKey(master, "session/2");
  assert.notEqual(hex(k1), hex(k2));
  assert.notEqual(hex(k3), hex(k4));
});

test("seed key: deriveSeedKeyFromMnemonic matches deriveMasterSecret+deriveSeedKey", () => {
  const m = generateMnemonic24();
  const pwd = "pass";
  const path = "ed25519/identity";
  const master = deriveMasterSecret(m, pwd);
  const k1 = deriveSeedKey(master, path);
  const k2 = deriveSeedKeyFromMnemonic(m, pwd, path);
  assert.equal(hex(k1), hex(k2));
});

// ---------------------------------------------------------------------------
// GROUP 4 — Crypto keys & recovery
// ---------------------------------------------------------------------------

test("recovery: mnemonic + password → reproducible Ed25519/X25519 keys", () => {
  const m = generateMnemonic24();
  const pwd = "test-password";

  const master1 = deriveMasterSecret(m, pwd);
  const seedSign1 = deriveSeedKey(master1, "ed25519/identity");
  const ed1 = nz.nzCrypto.ed25519.importPrivateKey(seedSign1);
  const seedX1 = deriveSeedKey(master1, "x25519/identity");
  const x1 = nz.nzCrypto.x25519.importPrivateKey(seedX1);

  const master2 = deriveMasterSecret(m, pwd);
  const seedSign2 = deriveSeedKey(master2, "ed25519/identity");
  const ed2 = nz.nzCrypto.ed25519.importPrivateKey(seedSign2);
  const seedX2 = deriveSeedKey(master2, "x25519/identity");
  const x2 = nz.nzCrypto.x25519.importPrivateKey(seedX2);

  assert.equal(hex(master1), hex(master2));
  assert.equal(hex(ed1.privateKey), hex(ed2.privateKey));
  assert.equal(hex(ed1.publicKey), hex(ed2.publicKey));
  assert.equal(hex(x1.privateKey), hex(x2.privateKey));
  assert.equal(hex(x1.publicKey), hex(x2.publicKey));
});

test("recovery: wrong password → different master secret and keys", () => {
  const m = generateMnemonic24();

  const master1 = deriveMasterSecret(m, "pass1");
  const seedSign1 = deriveSeedKey(master1, "ed25519/identity");
  const ed1 = nz.nzCrypto.ed25519.importPrivateKey(seedSign1);

  const master2 = deriveMasterSecret(m, "pass2");
  const seedSign2 = deriveSeedKey(master2, "ed25519/identity");
  const ed2 = nz.nzCrypto.ed25519.importPrivateKey(seedSign2);

  assert.notEqual(hex(master1), hex(master2));
  assert.notEqual(hex(ed1.privateKey), hex(ed2.privateKey));
});

// ---------------------------------------------------------------------------
// GROUP 5 — Property-based checks (multiple random samples)
// ---------------------------------------------------------------------------

test("property: 100 mnemonics → all valid and distinct master secrets", () => {
  const seenMasters = new Set();
  for (let i = 0; i < 100; i++) {
    const m = generateMnemonic24();
    const parts = m.split(" ");
    assert.equal(parts.length, 24);
    for (const w of parts) {
      assert.ok(WORDLIST.includes(w));
    }
    const master = deriveMasterSecret(m, "pass");
    const h = hex(master);
    assert.ok(!seenMasters.has(h), "duplicate master secret detected");
    seenMasters.add(h);
  }
});

test("property: 100 master secrets → seed keys differ for different paths", () => {
  for (let i = 0; i < 100; i++) {
    const m = generateMnemonic24();
    const master = deriveMasterSecret(m, "pass");
    const k1 = deriveSeedKey(master, "path/one");
    const k2 = deriveSeedKey(master, "path/two");
    assert.notEqual(hex(k1), hex(k2));
  }
});

// ---------------------------------------------------------------------------
// GROUP 6 — Basic performance sanity checks (no strict thresholds)
// ---------------------------------------------------------------------------

test("performance: deriveMasterSecret runs within reasonable time", () => {
  const m = generateMnemonic24();
  const pwd = "performance-test-password";
  const start = Date.now();
  for (let i = 0; i < 10; i++) {
    deriveMasterSecret(m, pwd);
  }
  const elapsed = Date.now() - start;
  // Не жёсткий порог, просто sanity check
  assert.ok(elapsed < 5000, `deriveMasterSecret too slow: ${elapsed} ms for 10 runs`);
});

test("performance: deriveSeedKey runs within reasonable time", () => {
  const m = generateMnemonic24();
  const master = deriveMasterSecret(m, "pass");
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    deriveSeedKey(master, "perf/test/path");
  }
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 5000, `deriveSeedKey too slow: ${elapsed} ms for 100 runs`);
});