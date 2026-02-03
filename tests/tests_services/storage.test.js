// Module: Storage Microservice Integration Test
// Description: Integration test for the Storage service of NewZoneReference with crypto-routing soft-mode.
// Run: node --test tests/tests_services/storage.test.js
// File: storage.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.storage}`;

// -------------------------------
// Tests
// -------------------------------

test("storage: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("storage: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    assert.equal(res.status, 403);
});

test("storage: allow plain JSON in soft-mode", async () => {
    const key = "storage_key_" + Math.random().toString(36).slice(2);
    const value = "value_" + Date.now();

    const res = await fetch(`${BASE}/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.key, key);
    assert.equal(json.value, value);
});

test("storage: get stored value", async () => {
    const key = "storage_key_" + Math.random().toString(36).slice(2);
    const value = "value_" + Date.now();

    // set
    await fetch(`${BASE}/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
    });

    // get
    const res = await fetch(`${BASE}/get/${key}`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.key, key);
    assert.equal(json.value, value);
});