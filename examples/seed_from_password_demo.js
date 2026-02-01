// ============================================================================
// seed_from_password_demo.js
// Generate 24-word mnemonic → master secret → Ed25519/X25519 keys
// Run: node examples/seed_from_password_demo.js
// ============================================================================

const fs = require("fs");
const readline = require("readline");
const crypto = require("crypto");

const {
  deriveMasterSecret,
  deriveSeedKey,
} = require("../lib/nz-crypto-seed.js");

const nz = require("../lib/nz-crypto.js");

// ---------------------------------------------------------------------------
// 1. Load BIP-39 English wordlist (2048 words)
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
// 2. Generate 24-word mnemonic from 48 bytes of entropy
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
// 3. CLI prompt
// ---------------------------------------------------------------------------

function askPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("Enter password: ", (pwd) => {
      rl.close();
      resolve(pwd);
    });
  });
}

// ---------------------------------------------------------------------------
// 4. Main flow
// ---------------------------------------------------------------------------

(async () => {
  console.log("=== NewZone SEED DEMO ===");

  const password = await askPassword();
  const mnemonic = generateMnemonic24();

  console.log("\nMnemonic (24 words):");
  console.log(mnemonic);

  const master = deriveMasterSecret(mnemonic, password);
  console.log("\nMaster secret (hex):");
  console.log(Buffer.from(master).toString("hex"));

  // Derive Ed25519 key
  const seedSign = deriveSeedKey(master, "ed25519/identity");
  const ed = nz.nzCrypto.ed25519.importPrivateKey(seedSign);

  console.log("\nEd25519 keys:");
  console.log("  private:", Buffer.from(ed.privateKey).toString("hex"));
  console.log("  public :", Buffer.from(ed.publicKey).toString("hex"));

  // Derive X25519 key
  const seedX = deriveSeedKey(master, "x25519/identity");
  const xk = nz.nzCrypto.x25519.importPrivateKey(seedX);

  console.log("\nX25519 keys:");
  console.log("  private:", Buffer.from(xk.privateKey).toString("hex"));
  console.log("  public :", Buffer.from(xk.publicKey).toString("hex"));

  console.log("\nDone.");
})();