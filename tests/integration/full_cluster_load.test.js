// Module: Full Cluster Load Test
// Description: High‑load parallel stress test for all 18 NewZone microservices.
// Run: node --test tests/integration/full_cluster_load.test.js
// File: full_cluster_load.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const ALL_SERVICES = Object.keys(PORTS);

// -------------------------------
// Helper: parallel load executor
// -------------------------------
async function runParallel(count, fn) {
    const tasks = [];
    for (let i = 0; i < count; i++) tasks.push(fn(i));
    return Promise.all(tasks);
}

// -------------------------------
// 1. Massive health‑check load
// -------------------------------
test("load: 1000 parallel /health checks across all services", async () => {
    await runParallel(1000, async i => {
        const name = ALL_SERVICES[i % ALL_SERVICES.length];
        const port = PORTS[name];

        const res = await fetch(`http://localhost:${port}/health`);
        assert.equal(res.status, 200);
    });
});

// -------------------------------
// 2. Discovery load: 500 parallel /nodes
// -------------------------------
test("load: discovery /nodes under 500 parallel requests", async () => {
    await runParallel(500, async () => {
        const res = await fetch(`http://localhost:${PORTS.discovery}/nodes`);
        assert.equal(res.status, 200);
        await res.json();
    });
});

// -------------------------------
// 3. P2P Node load: announce + heartbeat spam
// -------------------------------
test("load: p2p-node announce + heartbeat under 300 parallel requests", async () => {
    const base = `http://localhost:${PORTS.p2p_node}`;

    await runParallel(300, async i => {
        const id = "load-peer-" + i;
        const url = "http://localhost:" + (9000 + i);

        // announce
        const a = await fetch(`${base}/p2p/announce`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, url })
        });
        assert.equal(a.status, 200);

        // heartbeat
        const h = await fetch(`${base}/p2p/heartbeat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, url })
        });
        assert.equal(h.status, 200);
    });
});

// -------------------------------
// 4. P2P Messaging load: 500 messages
// -------------------------------
test("load: p2p-messaging send under 500 parallel requests", async () => {
    const base = `http://localhost:${PORTS.p2p_messaging}`;

    await runParallel(500, async i => {
        const payload = {
            to: "load-target-" + (i % 10),
            message: "msg_" + i + "_" + Date.now()
        };

        const res = await fetch(`${base}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        assert.equal(res.status, 200);
    });
});

// -------------------------------
// 5. Gateway load: 300 health checks
// -------------------------------
test("load: gateway responds under 300 parallel requests", async () => {
    await runParallel(300, async () => {
        const res = await fetch(`http://localhost:${PORTS.gateway}/health`);
        assert.equal(res.status, 200);
    });
});

// -------------------------------
// 6. Logging + Monitoring load
// -------------------------------
test("load: logging + monitoring under 200 parallel requests each", async () => {
    await runParallel(200, async () => {
        const log = await fetch(`http://localhost:${PORTS.logging}/health`);
        assert.equal(log.status, 200);

        const mon = await fetch(`http://localhost:${PORTS.monitoring}/health`);
        assert.equal(mon.status, 200);
    });
});

// -------------------------------
// 7. Queue + Event load
// -------------------------------
test("load: queue + event under 200 parallel requests", async () => {
    await runParallel(200, async () => {
        const q = await fetch(`http://localhost:${PORTS.queue}/health`);
        assert.equal(q.status, 200);

        const e = await fetch(`http://localhost:${PORTS.event}/health`);
        assert.equal(e.status, 200);
    });
});

// -------------------------------
// 8. Full cluster stability check
// -------------------------------
test("load: full cluster stability (all services respond after load)", async () => {
    for (const name of ALL_SERVICES) {
        const port = PORTS[name];
        const res = await fetch(`http://localhost:${port}/health`);
        assert.equal(res.status, 200);
    }
});