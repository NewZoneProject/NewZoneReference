// Module: Full Cluster Integration Test
// Description: Validates ports, health, discovery, and P2P layer across all NewZone microservices.
// Run: node --test tests/integration/full_cluster.test.js
// File: full_cluster.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

// -------------------------------
// Service set
// -------------------------------
const CORE_SERVICES = [
    "identity",
    "metadata",
    "consensus",
    "storage",
    "gateway",
    "routing",
    "logging",
    "monitoring",
    "analytics",
    "directory",
    "scheduler",
    "state",
    "queue",
    "rules",
    "replication",
    "event",
    "discovery"
];

const P2P_SERVICES = [
    "p2p_node",
    "p2p_messaging"
];

const ALL_SERVICES = [...CORE_SERVICES, ...P2P_SERVICES];

// -------------------------------
// 0. Ports sanity: all defined and unique
// -------------------------------
test("cluster: all service ports are defined and unique", () => {
    const seen = new Map();

    for (const name of ALL_SERVICES) {
        const port = PORTS[name];
        assert.ok(
            typeof port === "number",
            `PORTS.${name} must be a number, got ${port}`
        );

        assert.ok(
            port > 0 && port < 65536,
            `PORTS.${name} must be a valid TCP port, got ${port}`
        );

        if (seen.has(port)) {
            throw new Error(
                `Port conflict: ${name} and ${seen.get(port)} share port ${port}`
            );
        }

        seen.set(port, name);
    }
});

// -------------------------------
// 1. Health checks for all services
// -------------------------------
for (const name of ALL_SERVICES) {
    test(`cluster: ${name} /health`, async () => {
        const port = PORTS[name];
        const res = await fetch(`http://localhost:${port}/health`);
        assert.equal(res.status, 200, `${name} /health must return 200`);

        const json = await res.json();
        assert.equal(json.status, "ok", `${name} /health must return { status: "ok" }`);
    });
}

// -------------------------------
// 2. Discovery trust-store
// -------------------------------
test("cluster: discovery /nodes returns JSON object", async () => {
    const res = await fetch(`http://localhost:${PORTS.discovery}/nodes`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(
        typeof json === "object" && json !== null,
        "discovery /nodes must return a JSON object"
    );
});

// -------------------------------
// 3. P2P Node: announce, heartbeat, merge, peers
// -------------------------------
test("cluster: p2p-node announce + peers", async () => {
    const base = `http://localhost:${PORTS.p2p_node}`;

    const payload = {
        id: "integration-peer-announce",
        url: "http://localhost:9100"
    };

    const res = await fetch(`${base}/p2p/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.id, payload.id);
    assert.equal(json.url, payload.url);

    const peersRes = await fetch(`${base}/peers`);
    assert.equal(peersRes.status, 200);

    const peers = await peersRes.json();
    assert.ok(Array.isArray(peers));
    const ids = peers.map(p => p.id);
    assert.ok(ids.includes("integration-peer-announce"));
});

test("cluster: p2p-node heartbeat updates peer", async () => {
    const base = `http://localhost:${PORTS.p2p_node}`;

    const payload = {
        id: "integration-peer-heartbeat",
        url: "http://localhost:9101"
    };

    // announce first
    await fetch(`${base}/p2p/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    // then heartbeat
    const res = await fetch(`${base}/p2p/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
});

test("cluster: p2p-node merge peers", async () => {
    const base = `http://localhost:${PORTS.p2p_node}`;

    const mergePayload = {
        peers: [
            { id: "integration-merge-1", url: "http://localhost:9201" },
            { id: "integration-merge-2", url: "http://localhost:9202" }
        ]
    };

    const res = await fetch(`${base}/p2p/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergePayload)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);

    const peersRes = await fetch(`${base}/peers`);
    assert.equal(peersRes.status, 200);

    const peers = await peersRes.json();
    const ids = peers.map(p => p.id);
    assert.ok(ids.includes("integration-merge-1"));
    assert.ok(ids.includes("integration-merge-2"));
});

// -------------------------------
// 4. P2P Messaging: crypto-routing soft-mode + messages
// -------------------------------
test("cluster: p2p-messaging rejects invalid crypto-routing packet", async () => {
    const base = `http://localhost:${PORTS.p2p_messaging}`;

    const res = await fetch(`${base}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    // service should enforce verifyRoutingPacket and reject invalid packet
    assert.equal(res.status, 403);
});

test("cluster: p2p-messaging accepts plain JSON in soft-mode", async () => {
    const base = `http://localhost:${PORTS.p2p_messaging}`;

    const payload = {
        to: "integration-target",
        message: "hello_cluster_" + Date.now()
    };

    const res = await fetch(`${base}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.to, payload.to);
    assert.equal(json.message, payload.message);
});

test("cluster: p2p-messaging /messages returns array", async () => {
    const base = `http://localhost:${PORTS.p2p_messaging}`;

    const res = await fetch(`${base}/messages`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(Array.isArray(json));
});

// -------------------------------
// 5. Cross-layer scenario: discovery + p2p-node + p2p-messaging
// -------------------------------
test("cluster: cross-layer flow discovery → p2p-node → p2p-messaging", async () => {
    // 1) discovery is up and returns nodes
    const discoveryRes = await fetch(`http://localhost:${PORTS.discovery}/nodes`);
    assert.equal(discoveryRes.status, 200);
    const nodes = await discoveryRes.json();
    assert.ok(typeof nodes === "object" && nodes !== null);

    // 2) p2p-node accepts announce
    const nodeBase = `http://localhost:${PORTS.p2p_node}`;
    const peerPayload = {
        id: "integration-cross-peer",
        url: "http://localhost:9300"
    };

    const announceRes = await fetch(`${nodeBase}/p2p/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(peerPayload)
    });

    assert.equal(announceRes.status, 200);

    // 3) p2p-messaging accepts a message to that peer id (logical link)
    const msgBase = `http://localhost:${PORTS.p2p_messaging}`;
    const msgPayload = {
        to: peerPayload.id,
        message: "cross_layer_" + Date.now()
    };

    const sendRes = await fetch(`${msgBase}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgPayload)
    });

    assert.equal(sendRes.status, 200);

    const listRes = await fetch(`${msgBase}/messages`);
    assert.equal(listRes.status, 200);

    const messages = await listRes.json();
    assert.ok(Array.isArray(messages));
});

// -------------------------------
// 6. Basic gateway smoke (if only /health exists, this is enough)
// -------------------------------
test("cluster: gateway /health already covered, but endpoint is reachable", async () => {
    const res = await fetch(`http://localhost:${PORTS.gateway}/health`);
    assert.equal(res.status, 200);
});

// -------------------------------
// 7. Logging + monitoring health already covered, but we assert they respond fast
// -------------------------------
test("cluster: logging and monitoring respond within reasonable time", async () => {
    const startLog = Date.now();
    const logRes = await fetch(`http://localhost:${PORTS.logging}/health`);
    assert.equal(logRes.status, 200);
    const logDuration = Date.now() - startLog;

    const startMon = Date.now();
    const monRes = await fetch(`http://localhost:${PORTS.monitoring}/health`);
    assert.equal(monRes.status, 200);
    const monDuration = Date.now() - startMon;

    assert.ok(logDuration < 2000, "logging /health should respond quickly");
    assert.ok(monDuration < 2000, "monitoring /health should respond quickly");
});