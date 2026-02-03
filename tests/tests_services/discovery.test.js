// Module: Discovery Microservice Integration Test
// Description: Integration test for the Discovery service of NewZoneReference (UDP broadcaster + HTTP registry).
// Run: node --test tests/tests_services/discovery.test.js
// File: discovery.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.discovery}`;

test("discovery: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("discovery: nodes list is available", async () => {
    const res = await fetch(`${BASE}/nodes`);
    assert.equal(res.status, 200);

    const json = await res.json();

    // Discovery must return an object
    assert.ok(typeof json === "object");

    // At least one node must be present (discovery itself)
    assert.ok(Object.keys(json).length > 0);
});

test("discovery: node entries contain required fields", async () => {
    const res = await fetch(`${BASE}/nodes`);
    assert.equal(res.status, 200);

    const nodes = await res.json();
    const first = Object.values(nodes)[0];

    // Each node entry must contain required fields
    assert.ok(first.public_key);
    assert.ok(first.service);
    assert.ok(first.ip);
    assert.ok(first.port);
});