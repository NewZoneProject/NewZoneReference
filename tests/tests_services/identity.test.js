// Module: Identity Microservice Integration Test
// Description: Integration test for the Identity service of NewZoneReference.
// Run: node --test tests/tests_services/identity.test.js
// File: identity.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.identity}`;

test("identity: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("identity: generate keypair", async () => {
    const res = await fetch(`${BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.public_key);
    assert.ok(json.private_key);
});