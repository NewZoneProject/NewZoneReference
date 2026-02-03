// Module: Consensus Microservice Integration Test
// Description: Integration test for the Consensus service of NewZoneReference with crypto-routing soft-mode.
// Run: node --test tests/tests_services/consensus.test.js
// File: consensus.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.consensus}`;

test("consensus: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("consensus: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    assert.equal(res.status, 403);
});

test("consensus: allow plain JSON in soft-mode", async () => {
    const proposal = {
        id: "proposal_" + Math.random().toString(36).slice(2),
        topic: "replication",
        payload: { key: "X", value: "Y" }
    };

    const res = await fetch(`${BASE}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.id, proposal.id);
    assert.equal(json.topic, proposal.topic);
    assert.deepEqual(json.payload, proposal.payload);
});

test("consensus: get vote status", async () => {
    const id = "proposal_" + Math.random().toString(36).slice(2);

    // simulate proposal
    await fetch(`${BASE}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id,
            topic: "routing",
            payload: { route: "/X" }
        })
    });

    // check status
    const res = await fetch(`${BASE}/status/${id}`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.id, id);
    assert.ok(["pending", "accepted", "rejected"].includes(json.status));
});