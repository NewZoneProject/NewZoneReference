// ============================================================================
// recover_from_mnemonic_demo.js
// Restore master secret + Ed25519/X25519 keys from mnemonic + password
// Run: node examples/recover_from_mnemonic_demo.js
// ============================================================================

const readline = require("readline");
const {
  deriveMasterSecret,
  deriveSeedKey,
} = require("../lib/nz-crypto-seed.js");

const nz = require("../lib/nz-crypto.js");

// ---------------------------------------------------------------------------
// 1. CLI helpers
// ---------------------------------------------------------------------------

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (value) => {
      rl.close();
      resolve(value.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// 2. Main flow
// ---------------------------------------------------------------------------

(async () => {
  console.log("=== NewZone RECOVERY DEMO ===");

  const mnemonic = await ask("Enter your 24-word mnemonic:\n> ");
  const password = await ask("Enter password:\n> ");

  console.log("\nRestoring...");

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