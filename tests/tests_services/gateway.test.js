// Module: Gateway Microservice Integration Test
// Description: Integration test for the Gateway crypto-firewall and unified router of NewZoneReference.
// Run: node --test tests/tests_services/gateway.test.js
// File: gateway.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.gateway}`;

test("gateway: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("gateway: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/identity/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    // Should reject invalid crypto packet
    assert.equal(res.status, 403);
});

test("gateway: allow plain JSON in soft-mode", async () => {
    const res = await fetch(`${BASE}/identity/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });

    assert.equal(res.status, 200);

    const json = await res.json();

    // Recursively search for keys inside any nested structure
    function findKeys(obj) {
        if (!obj || typeof obj !== "object") return null;

        if (obj.public_key && obj.private_key) return obj;

        for (const key of Object.keys(obj)) {
            const found = findKeys(obj[key]);
            if (found) return found;
        }

        return null;
    }

    const payload = findKeys(json);

    assert.ok(payload, "Gateway returned unexpected structure");
    assert.ok(payload.public_key);
    assert.ok(payload.private_key);
});