// Module: Logging Microservice Integration Test
// Description: Integration test for the Logging service of NewZoneReference with crypto-routing soft-mode.
// Run: node --test tests/tests_services/logging.test.js
// File: logging.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.logging}`;

test("logging: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("logging: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    assert.equal(res.status, 403);
});

test("logging: allow plain JSON in soft-mode", async () => {
    const entry = {
        level: "info",
        message: "log_" + Date.now()
    };

    const res = await fetch(`${BASE}/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.level, entry.level);
    assert.equal(json.message, entry.message);
});

test("logging: list logs", async () => {
    const res = await fetch(`${BASE}/logs`);
    assert.equal(res.status, 200);

    const json = await res.json();

    assert.ok(Array.isArray(json));
    assert.ok(json.length >= 0);
});