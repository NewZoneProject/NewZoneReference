// Module: P2P Messaging Microservice Integration Test
// Description: Integration test for the P2P Messaging service of NewZoneReference with crypto-routing soft-mode.
// Run: node --test tests/tests_services/p2p-messaging.test.js
// File: p2p-messaging.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.p2p_messaging}`;

// -------------------------------
// Tests
// -------------------------------

test("p2p-messaging: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("p2p-messaging: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    assert.equal(res.status, 403);
});

test("p2p-messaging: allow plain JSON in soft-mode", async () => {
    const payload = {
        to: "peer1",
        message: "hello_" + Date.now()
    };

    const res = await fetch(`${BASE}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.to, payload.to);
    assert.equal(json.message, payload.message);
});

test("p2p-messaging: list messages", async () => {
    const res = await fetch(`${BASE}/messages`);
    assert.equal(res.status, 200);

    const json = await res.json();

    assert.ok(Array.isArray(json));
    assert.ok(json.length >= 0);
});