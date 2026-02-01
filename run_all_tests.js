#!/usr/bin/env node

// ============================================================================
// NewZone — autonomous test runner
// Scans ./tests for *.test.js and runs them via node:test
// Run: node run_all_tests.js
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const TEST_DIR = "./tests";

// Collect all *.test.js files
const files = fs
  .readdirSync(TEST_DIR)
  .filter((f) => f.endsWith(".test.js"))
  .map((f) => path.join(TEST_DIR, f))
  .sort(); // deterministic order

if (files.length === 0) {
  console.error("No test files found in ./tests");
  process.exit(1);
}

console.log("Running tests:");
for (const f of files) console.log("  •", f);
console.log("");

// Run Node's built-in test runner
const result = spawnSync("node", ["--test", ...files], {
  stdio: "inherit",
});

process.exit(result.status);