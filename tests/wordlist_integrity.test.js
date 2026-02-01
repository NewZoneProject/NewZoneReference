// ============================================================================
// wordlist_integrity.test.js
// Ensures BIP-39 English wordlist is correct, complete, and immutable
// Run: node --test tests/wordlist_integrity.test.js
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

const WORDLIST_PATH = "./lib/bip-39-english.txt";

// Official SHA-256 for the BIP-39 English wordlist (2048 words)
const EXPECTED_SHA256 =
  "d2bd2aeb50ac5df60c1eb10afcec2b680d5a8a9f2bbc74a15c45bf3525528334";

function sha256Hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

test("wordlist: file exists", () => {
  assert.ok(fs.existsSync(WORDLIST_PATH), "bip-39-english.txt missing");
});

test("wordlist: contains exactly 2048 words", () => {
  const raw = fs.readFileSync(WORDLIST_PATH, "utf8");
  const words = raw.split(/\r?\n/).filter((w) => w.trim().length > 0);

  assert.equal(words.length, 2048, "wordlist must contain 2048 words");
});

test("wordlist: no empty lines", () => {
  const raw = fs.readFileSync(WORDLIST_PATH, "utf8");
  const lines = raw.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    assert.ok(lines[i].trim().length > 0, `empty line at index ${i}`);
  }
});

test("wordlist: SHA-256 hash matches reference", () => {
  const raw = fs.readFileSync(WORDLIST_PATH);
  const hash = sha256Hex(raw);

  assert.equal(
    hash,
    EXPECTED_SHA256,
    "wordlist SHA-256 hash mismatch — file was modified"
  );
});