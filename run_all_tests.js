#!/usr/bin/env node

// ============================================================================
// NewZone — autonomous test runner
// Recursively scans ./tests for *.test.js and runs them via node:test
// Run: node run_all_tests.js
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const TEST_DIR = "./tests";

function collectTests(dir) {
  const entries = fs.readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      files.push(...collectTests(full));
    } else if (entry.endsWith(".test.js")) {
      files.push(full);
    }
  }

  return files;
}

const files = collectTests(TEST_DIR).sort();

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