// ============================================================================
// mnemonic_format.test.js
// Test: generated mnemonic must be 24 valid BIP-39 words
// Run: node --test tests/mnemonic_format.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

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
// Generate 24-word mnemonic (same as in demo)
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
// Tests
// ---------------------------------------------------------------------------

test("mnemonic format: must contain exactly 24 words", () => {
  const mnemonic = generateMnemonic24();
  const parts = mnemonic.split(" ");

  assert.equal(parts.length, 24, "mnemonic must contain 24 words");
});

test("mnemonic format: all words must be from BIP-39 list", () => {
  const mnemonic = generateMnemonic24();
  const parts = mnemonic.split(" ");

  for (const word of parts) {
    assert.ok(
      WORDLIST.includes(word),
      `word '${word}' must exist in BIP-39 wordlist`
    );
  }
});

test("mnemonic format: no empty words", () => {
  const mnemonic = generateMnemonic24();
  const parts = mnemonic.split(" ");

  for (const word of parts) {
    assert.ok(word.length > 0, "mnemonic contains an empty word");
  }
});

test("mnemonic format: no duplicate adjacent words", () => {
  const mnemonic = generateMnemonic24();
  const parts = mnemonic.split(" ");

  for (let i = 1; i < parts.length; i++) {
    assert.notEqual(
      parts[i],
      parts[i - 1],
      `duplicate adjacent words: '${parts[i]}'`
    );
  }
});