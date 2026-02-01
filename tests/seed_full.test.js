// ============================================================================
// seed_full.test.js
// Comprehensive test suite for mnemonic → master secret → key derivation
// Run: node --test tests/seed_full.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

import {
  deriveMasterSecret,
  deriveSeedKey,
} from "../lib/nz-crypto-seed.js";

import nz from "../lib/nz-crypto.js";

// ---------------------------------------------------------------------------
// Load BIP-39 wordlist
// ---------------------------------------------------------------------------

const WORDLIST = fs
  .readFileSync("./lib/bip-39-english.txt", "utf8")
  .split(/\r?\n/)
  .map((w) => w.trim())
  .filter((w) => w.length > 0);

if (WORDLIST.length !== 2048) {
  throw new Error("bip-39-english.txt must contain exactly 2048 words");
}

// ---------------------------------------------------------------------------
// Mnemonic generator (same as in demo)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// TEST GROUP 1 — Mnemonic format
// ---------------------------------------------------------------------------

test("mnemonic: must contain exactly 24 words", () => {
  const mnemonic = generateMnemonic24();
  const parts = mnemonic.split(" ");
  assert.equal(parts.length, 24);
});

test("mnemonic: all words must be from BIP-39 list", () => {
  const mnemonic = generateMnemonic24();
  const parts = mnemonic.split(" ");
  for (const w of parts) {
    assert.ok(WORDLIST.includes(w), `invalid word: ${w}`);
  }
});

test("mnemonic: no empty words", () => {
  const mnemonic = generateMnemonic24();
  const parts = mnemonic.split(" ");
  for (const w of parts) {
    assert.ok(w.length > 0);
  }
});

test("mnemonic: no duplicate adjacent words", () => {
  const mnemonic = generateMnemonic24();
  const parts = mnemonic.split(" ");
  for (let i = 1; i < parts.length; i++) {
    assert.notEqual(parts[i], parts[i - 1], `duplicate: ${parts[i]}`);
  }
});

// ---------------------------------------------------------------------------
// TEST GROUP 2 — Master secret determinism
// ---------------------------------------------------------------------------

test("master secret: same mnemonic + same password → same master", () => {
  const mnemonic = generateMnemonic24();
  const pwd = "password123";

  const m1 = deriveMasterSecret(mnemonic, pwd);
  const m2 = deriveMasterSecret(mnemonic, pwd);

  assert.equal(
    Buffer.from(m1).toString("hex"),
    Buffer.from(m2).toString("hex")
  );
});

test("master secret: same mnemonic + different password → different master", () => {
  const mnemonic = generateMnemonic24();

  const m1 = deriveMasterSecret(mnemonic, "pass1");
  const m2 = deriveMasterSecret(mnemonic, "pass2");

  assert.notEqual(
    Buffer.from(m1).toString("hex"),
    Buffer.from(m2).toString("hex")
  );
});

test("master secret: different mnemonic + same password → different master", () => {
  const m1 = deriveMasterSecret(generateMnemonic24(), "pass");
  const m2 = deriveMasterSecret(generateMnemonic24(), "pass");

  assert.notEqual(
    Buffer.from(m1).toString("hex"),
    Buffer.from(m2).toString("hex")
  );
});

// ---------------------------------------------------------------------------
// TEST GROUP 3 — Key recovery
// ---------------------------------------------------------------------------

test("key recovery: mnemonic + password → reproducible Ed25519/X25519 keys", () => {
  const mnemonic = generateMnemonic24();
  const pwd = "test-password";

  // First derivation
  const master1 = deriveMasterSecret(mnemonic, pwd);

  const seedSign1 = deriveSeedKey(master1, "ed25519/identity");
  const ed1 = nz.nzCrypto.ed25519.importPrivateKey(seedSign1);

  const seedX1 = deriveSeedKey(master1, "x25519/identity");
  const x1 = nz.nzCrypto.x25519.importPrivateKey(seedX1);

  // Second derivation (recovery)
  const master2 = deriveMasterSecret(mnemonic, pwd);

  const seedSign2 = deriveSeedKey(master2, "ed25519/identity");
  const ed2 = nz.nzCrypto.ed25519.importPrivateKey(seedSign2);

  const seedX2 = deriveSeedKey(master2, "x25519/identity");
  const x2 = nz.nzCrypto.x25519.importPrivateKey(seedX2);

  // Compare master secrets
  assert.equal(
    Buffer.from(master1).toString("hex"),
    Buffer.from(master2).toString("hex")
  );

  // Compare Ed25519 keys
  assert.equal(
    Buffer.from(ed1.privateKey).toString("hex"),
    Buffer.from(ed2.privateKey).toString("hex")
  );
  assert.equal(
    Buffer.from(ed1.publicKey).toString("hex"),
    Buffer.from(ed2.publicKey).toString("hex")
  );

  // Compare X25519 keys
  assert.equal(
    Buffer.from(x1.privateKey).toString("hex"),
    Buffer.from(x2.privateKey).toString("hex")
  );
  assert.equal(
    Buffer.from(x1.publicKey).toString("hex"),
    Buffer.from(x2.publicKey).toString("hex")
  );
});