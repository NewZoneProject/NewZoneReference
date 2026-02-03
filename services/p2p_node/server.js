// Module: P2P Node Microservice HTTP Server
// Description: Minimal peer-to-peer node with announce, heartbeat, and merge endpoints with full crypto-routing + discovery trust-store.
// Run: node server.js
// File: server.js

const http = require("http");
const {
    addPeer,
    listPeers,
    mergePeers,
    sendHeartbeat
} = require("./index.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.p2p_node;
const SELF_ID = "node-" + Math.random().toString(36).slice(2, 10);
const SELF_URL = `http://localhost:${PORT}`;
const SELF_INFO = { id: SELF_ID, url: SELF_URL };

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
// Heartbeat loop
// -------------------------------
setInterval(async () => {
    const peers = listPeers();
    for (const peer of peers) {
        await sendHeartbeat(peer, SELF_INFO);
    }
}, 3000);

// -------------------------------
// HTTP Server
// -------------------------------
const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    // Healthcheck
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: "ok", id: SELF_ID }));
    }

    // GET /peers
    if (req.method === "GET" && req.url === "/peers") {
        res.writeHead(200);
        return res.end(JSON.stringify(listPeers()));
    }

    // POST /p2p/announce
    if (req.method === "POST" && req.url === "/p2p/announce") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { id, url } = payload || {};
            const peer = addPeer(id, url);

            res.writeHead(200);
            return res.end(JSON.stringify(peer));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid announce" }));
        }
    }

    // POST /p2p/heartbeat
    if (req.method === "POST" && req.url === "/p2p/heartbeat") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const peer = payload || {};
            addPeer(peer.id, peer.url);

            res.writeHead(200);
            return res.end(JSON.stringify({ ok: true }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid heartbeat" }));
        }
    }

    // POST /p2p/merge
    if (req.method === "POST" && req.url === "/p2p/merge") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { peers } = payload || {};
            mergePeers(peers);

            res.writeHead(200);
            return res.end(JSON.stringify({ ok: true }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid merge" }));
        }
    }

    // Not found
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

// -------------------------------
// Startup
// -------------------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`P2P Node Microservice running on http://0.0.0.0:${PORT}`);
});