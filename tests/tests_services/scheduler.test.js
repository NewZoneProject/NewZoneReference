// Module: Scheduler Microservice Integration Test
// Description: Integration test for the Scheduler service of NewZoneReference with crypto-routing soft-mode.
// Run: node --test tests/tests_services/scheduler.test.js
// File: scheduler.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.scheduler}`;

// -------------------------------
// Tests
// -------------------------------

test("scheduler: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("scheduler: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    assert.equal(res.status, 403);
});

test("scheduler: allow plain JSON in soft-mode", async () => {
    const job = {
        type: "test_job",
        cron: "* * * * *",
        payload: { ts: Date.now() }
    };

    const res = await fetch(`${BASE}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.type, job.type);
    assert.equal(json.cron, job.cron);
    assert.deepEqual(json.payload, job.payload);
});

test("scheduler: list scheduled jobs", async () => {
    const res = await fetch(`${BASE}/jobs`);
    assert.equal(res.status, 200);

    const json = await res.json();

    assert.ok(Array.isArray(json));
    assert.ok(json.length >= 0);
});