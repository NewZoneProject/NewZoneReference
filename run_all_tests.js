// ============================================================================
// run_all_tests.js
//
// Unified test runner for the entire NewZone crypto stack.
// Runs the single aggregated entry point: tests/all.test.js
//
// Run:
//   node run_all_tests.js
// ============================================================================

const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = __dirname;
const ENTRY = path.join(ROOT, "tests/all.test.js");

function main() {
  console.log("=== NZ-CRYPTO STACK SELF-TEST ===");
  console.log("Running: node --test tests/all.test.js\n");

  const res = spawnSync(process.execPath, ["--test", ENTRY], {
    stdio: "inherit",
  });

  console.log("\n=== NZ-CRYPTO STACK SELF-TEST RESULT ===");

  if (res.status === 0) {
    console.log("ALL TESTS PASSED");
    process.exit(0);
  } else {
    console.log("SOME TESTS FAILED");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}