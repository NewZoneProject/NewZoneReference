// Module: Queue Microservice HTTP Server
// Description: Minimal FIFO queue API for NewZoneReference with full crypto-routing + discovery trust-store.
// Run: node server.js
// File: server.js

const http = require("http");
const {
    enqueue,
    dequeue,
    peek,
    listQueues
} = require("./index.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { autoRegister, startHeartbeat } = require("../../lib/nz-lib.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.queue;
const SERVICE_ROLE = "queue";

// -------------------------------
// In-memory task list for test API
// -------------------------------
const tasks = []; // { type, payload }

// -------------------------------
// Dynamic trust-store (auto-updated from discovery)
// -------------------------------
let knownNodes = {};

async function getPublicKeyByNodeId(nodeId) {
    const entry = knownNodes[nodeId];
    if (!entry || !entry.public_key) return null;
    return Buffer.from(entry.public_key, "base64");
}

async function updateKnownNodes() {
    try {
        const req = http.get(`http://localhost:${PORTS.discovery}/nodes`, res => {
            let data = "";
            res.on("data", chunk => (data += chunk));
            res.on("end", () => {
                try {
                    knownNodes = JSON.parse(data);
                } catch {}
            });
        });

        req.on("error", () => {});
    } catch {}
}

setInterval(updateKnownNodes, 5000);
updateKnownNodes();

// -------------------------------
// Helper: parse body and optionally unwrap crypto-routing
// -------------------------------
async function parseRequestBodyWithCrypto(req, res) {
    return new Promise(resolve => {
        let body = "";
        req.on("data", chunk => (body += chunk));
        req.on("end", async () => {
            if (!body) return resolve({ ok: true, payload: null });

            let parsed;
            try {
                parsed = JSON.parse(body);
            } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON" }));
                return resolve({ ok: false, payload: null });
            }

            if (parsed && parsed.version === "nz-routing-crypto-01") {
                const result = await verifyRoutingPacket({
                    packet: parsed,
                    getPublicKeyByNodeId,
                    maxSkewSec: 300
                });

                if (!result.ok) {
                    res.writeHead(403);
                    res.end(JSON.stringify({ error: result.reason }));
                    return resolve({ ok: false, payload: null });
                }

                return resolve({ ok: true, payload: result.payload });
            }

            return resolve({ ok: true, payload: parsed });
        });
    });
}

// -------------------------------
// HTTP Server
// -------------------------------
const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    // Healthcheck
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: "ok" }));
    }

    // -------------------------------
    // TEST API: POST /push
    // -------------------------------
    if (req.method === "POST" && req.url === "/push") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { type, payload: inner } = payload || {};
            const task = { type, payload: inner };
            tasks.push(task);

            res.writeHead(200);
            return res.end(JSON.stringify(task));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid push" }));
        }
    }

    // -------------------------------
    // TEST API: GET /tasks
    // -------------------------------
    if (req.method === "GET" && req.url === "/tasks") {
        res.writeHead(200);
        return res.end(JSON.stringify(tasks));
    }

    // -------------------------------
    // ORIGINAL API: POST /enqueue
    // -------------------------------
    if (req.method === "POST" && req.url === "/enqueue") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { queue, payload: inner } = payload || {};
            const item = enqueue(queue, inner);

            res.writeHead(200);
            return res.end(JSON.stringify(item));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid enqueue" }));
        }
    }

    // POST /dequeue
    if (req.method === "POST" && req.url === "/dequeue") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { queue } = payload || {};
            const item = dequeue(queue);

            res.writeHead(200);
            return res.end(JSON.stringify(item || { empty: true }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid dequeue" }));
        }
    }

    // GET /peek
    if (req.method === "GET" && req.url.startsWith("/peek")) {
        const url = new URL(req.url, "http://localhost");
        const queue = url.searchParams.get("queue");
        const limit = Number(url.searchParams.get("limit") || 10);

        const items = peek(queue, limit);

        res.writeHead(200);
        return res.end(JSON.stringify(items));
    }

    // GET /queues
    if (req.method === "GET" && req.url === "/queues") {
        res.writeHead(200);
        return res.end(JSON.stringify(listQueues()));
    }

    // Not found
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

// -------------------------------
// Startup: register + heartbeat
// -------------------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Queue Microservice running on http://0.0.0.0:${PORT}`);

    autoRegister(SERVICE_ROLE, PORT);
    startHeartbeat(SERVICE_ROLE, PORT, 10000);
});