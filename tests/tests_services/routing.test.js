// Module: Routing Microservice Integration Test
// Description: Integration test for the Routing service of NewZoneReference with crypto-routing soft-mode.
// Run: node --test tests/tests_services/routing.test.js
// File: routing.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.routing}`;

test("routing: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("routing: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    assert.equal(res.status, 403);
});

test("routing: allow plain JSON in soft-mode", async () => {
    const res = await fetch(`${BASE}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            service: "identity",
            path: "/generate",
            method: "POST",
            payload: {}
        })
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.public_key);
    assert.ok(json.private_key);
});