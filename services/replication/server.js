// Module: Replication Microservice HTTP Server
// Description: Periodic data replication and snapshot refresh for NewZoneReference with full crypto-routing + discovery trust-store.
// Run: node server.js
// File: server.js

const http = require("http");
const {
    mergeData,
    dumpData,
    refreshLocalSnapshot,
    pushToPeer,
    pullFromPeer
} = require("./index.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { autoRegister, startHeartbeat } = require("../../lib/nz-lib.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.replication;
const SERVICE_ROLE = "replication";

// -------------------------------
// Dynamic trust-store
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
            res.on("data", c => (data += c));
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
// Crypto-routing parser
// -------------------------------
async function parseRequestBodyWithCrypto(req, res) {
    return new Promise(resolve => {
        let body = "";
        req.on("data", c => (body += c));
        req.on("end", async () => {
            if (!body) return resolve({ ok: true, payload: null, crypto: false });

            let parsed;
            try {
                parsed = JSON.parse(body);
            } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON" }));
                return resolve({ ok: false });
            }

            // Crypto-routing packet
            if (parsed && parsed.version === "nz-routing-crypto-01") {
                const result = await verifyRoutingPacket({
                    packet: parsed,
                    getPublicKeyByNodeId,
                    maxSkewSec: 300
                });

                if (!result.ok) {
                    res.writeHead(403);
                    res.end(JSON.stringify({ error: result.reason }));
                    return resolve({ ok: false });
                }

                return resolve({ ok: true, payload: result.payload, crypto: true });
            }

            // Plain JSON soft-mode
            return resolve({ ok: true, payload: parsed, crypto: false });
        });
    });
}

// -------------------------------
// Periodic sync loops
// -------------------------------
setInterval(async () => {
    try {
        const res = await fetch(`http://localhost:${PORTS.p2p}/peers`);
        const peers = await res.json();

        for (const peer of peers) {
            await pullFromPeer(peer.url);
            await pushToPeer(peer.url);
        }
    } catch {}
}, 5000);

setInterval(refreshLocalSnapshot, 4000);

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

    // POST /replicate — incoming data
    if (req.method === "POST" && req.url === "/replicate") {
        const { ok, payload, crypto } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            if (crypto) {
                // Real replication
                mergeData(payload);
                res.writeHead(200);
                return res.end(JSON.stringify({ ok: true }));
            }

            // Soft-mode plain JSON
            const { key, value } = payload || {};
            res.writeHead(200);
            return res.end(JSON.stringify({ key, value }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid replication" }));
        }
    }

    // GET /dump — export local data
    if (req.method === "GET" && req.url === "/dump") {
        res.writeHead(200);
        return res.end(JSON.stringify(dumpData()));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

// -------------------------------
// Startup: register + heartbeat
// -------------------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Replication Microservice running on http://0.0.0.0:${PORT}`);

    autoRegister(SERVICE_ROLE, PORT);
    startHeartbeat(SERVICE_ROLE, PORT, 10000);
});