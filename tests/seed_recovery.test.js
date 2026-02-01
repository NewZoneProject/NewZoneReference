// ============================================================================
// seed_recovery.test.js
// Test: mnemonic → master secret → keys → recovery → same keys
// Run: node --test tests/seed_recovery.test.js
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
// Generate 24-word mnemonic
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
// Test
// ---------------------------------------------------------------------------

test("seed recovery: mnemonic + password → same master secret and keys", async () => {
  const password = "test-password";
  const mnemonic = generateMnemonic24();

  // 1. Original derivation
  const master1 = deriveMasterSecret(mnemonic, password);

  const seedSign1 = deriveSeedKey(master1, "ed25519/identity");
  const ed1 = nz.nzCrypto.ed25519.importPrivateKey(seedSign1);

  const seedX1 = deriveSeedKey(master1, "x25519/identity");
  const x1 = nz.nzCrypto.x25519.importPrivateKey(seedX1);

  // 2. Recovery derivation
  const master2 = deriveMasterSecret(mnemonic, password);

  const seedSign2 = deriveSeedKey(master2, "ed25519/identity");
  const ed2 = nz.nzCrypto.ed25519.importPrivateKey(seedSign2);

  const seedX2 = deriveSeedKey(master2, "x25519/identity");
  const x2 = nz.nzCrypto.x25519.importPrivateKey(seedX2);

  // -------------------------------------------------------------------------
  // Assertions
  // -------------------------------------------------------------------------

  assert.equal(
    Buffer.from(master1).toString("hex"),
    Buffer.from(master2).toString("hex"),
    "master secrets must match"
  );

  assert.equal(
    Buffer.from(ed1.privateKey).toString("hex"),
    Buffer.from(ed2.privateKey).toString("hex"),
    "Ed25519 private keys must match"
  );

  assert.equal(
    Buffer.from(ed1.publicKey).toString("hex"),
    Buffer.from(ed2.publicKey).toString("hex"),
    "Ed25519 public keys must match"
  );

  assert.equal(
    Buffer.from(x1.privateKey).toString("hex"),
    Buffer.from(x2.privateKey).toString("hex"),
    "X25519 private keys must match"
  );

  assert.equal(
    Buffer.from(x1.publicKey).toString("hex"),
    Buffer.from(x2.publicKey).toString("hex"),
    "X25519 public keys must match"
  );
});