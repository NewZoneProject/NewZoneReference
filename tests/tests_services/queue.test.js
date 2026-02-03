// Module: Queue Microservice Integration Test
// Description: Integration test for the Queue service of NewZoneReference with crypto-routing soft-mode.
// Run: node --test tests/tests_services/queue.test.js
// File: queue.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.queue}`;

test("queue: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("queue: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    assert.equal(res.status, 403);
});

test("queue: allow plain JSON in soft-mode", async () => {
    const task = {
        type: "test_task",
        payload: { ts: Date.now(), ok: true }
    };

    const res = await fetch(`${BASE}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.type, task.type);
    assert.deepEqual(json.payload, task.payload);
});

test("queue: list tasks", async () => {
    const res = await fetch(`${BASE}/tasks`);
    assert.equal(res.status, 200);

    const json = await res.json();

    assert.ok(Array.isArray(json));
    assert.ok(json.length >= 0);
});