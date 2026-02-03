// Module: P2P Node Microservice Integration Test
// Description: Integration test for the P2P Node service of NewZoneReference with crypto-routing soft-mode.
// Run: node --test tests/tests_services/p2p-node.test.js
// File: p2p-node.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.p2p_node}`;

// -------------------------------
// Tests
// -------------------------------

test("p2p-node: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
    assert.ok(json.id);
});

test("p2p-node: announce peer", async () => {
    const payload = {
        id: "peer-test-1",
        url: "http://localhost:9999"
    };

    const res = await fetch(`${BASE}/p2p/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.id, payload.id);
    assert.equal(json.url, payload.url);
});

test("p2p-node: heartbeat updates peer timestamp", async () => {
    const payload = {
        id: "peer-test-2",
        url: "http://localhost:9998"
    };

    // First announce
    await fetch(`${BASE}/p2p/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    // Then heartbeat
    const res = await fetch(`${BASE}/p2p/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
});

test("p2p-node: merge peers", async () => {
    const mergePayload = {
        peers: [
            { id: "peer-merge-1", url: "http://localhost:9101" },
            { id: "peer-merge-2", url: "http://localhost:9102" }
        ]
    };

    const res = await fetch(`${BASE}/p2p/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergePayload)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);

    // Validate peers exist
    const peersRes = await fetch(`${BASE}/peers`);
    assert.equal(peersRes.status, 200);

    const peers = await peersRes.json();
    assert.ok(Array.isArray(peers));

    const ids = peers.map(p => p.id);
    assert.ok(ids.includes("peer-merge-1"));
    assert.ok(ids.includes("peer-merge-2"));
});