// Module: Event Microservice Integration Test
// Description: Integration test for the Event service of NewZoneReference with crypto-routing soft-mode.
// Run: node --test tests/tests_services/event.test.js
// File: event.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.event}`;

test("event: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("event: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    assert.equal(res.status, 403);
});

test("event: allow plain JSON in soft-mode", async () => {
    const event = {
        type: "test_event",
        payload: { ts: Date.now(), ok: true }
    };

    const res = await fetch(`${BASE}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.event.type, event.type);
    assert.deepEqual(json.event.payload, event.payload);
});

test("event: list events", async () => {
    const res = await fetch(`${BASE}/events`);
    assert.equal(res.status, 200);

    const json = await res.json();

    // Must be an array
    assert.ok(Array.isArray(json));

    // Array may contain events
    assert.ok(json.length >= 0);
});