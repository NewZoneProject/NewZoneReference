// Module: Replication Microservice Integration Test
// Description: Integration test for the Replication service of NewZoneReference with crypto-routing soft-mode.
// Run: node --test tests/tests_services/replication.test.js
// File: replication.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.replication}`;

test("replication: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("replication: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/replicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    assert.equal(res.status, 403);
});

test("replication: allow plain JSON in soft-mode", async () => {
    const payload = {
        key: "rep_key_" + Math.random().toString(36).slice(2),
        value: "value_" + Date.now(),
        ts: Date.now()
    };

    const res = await fetch(`${BASE}/replicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.key, payload.key);
    assert.equal(json.value, payload.value);
});