// Module: Monitoring Microservice Integration Test
// Description: Integration test for the Monitoring service of NewZoneReference with crypto-routing soft-mode.
// Run: node --test tests/tests_services/monitoring.test.js
// File: monitoring.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.monitoring}`;

test("monitoring: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("monitoring: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    assert.equal(res.status, 403);
});

test("monitoring: allow plain JSON in soft-mode", async () => {
    const report = {
        service: "test_service",
        status: "ok",
        ts: Date.now()
    };

    const res = await fetch(`${BASE}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.service, report.service);
    assert.equal(json.status, report.status);
    assert.equal(json.ts, report.ts);
});

test("monitoring: list reports", async () => {
    const res = await fetch(`${BASE}/reports`);
    assert.equal(res.status, 200);

    const json = await res.json();

    assert.ok(Array.isArray(json));
    assert.ok(json.length >= 0);
});