// Module: P2P Messaging Microservice HTTP Server
// Description: Minimal P2P messaging API with crypto-routing soft-mode.
// Run: node server.js
// File: server.js

const http = require("http");
const { storeMessage, listMessages } = require("./index.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.p2p_messaging;

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
            if (!body) return resolve({ ok: true, payload: null });

            let parsed;
            try {
                parsed = JSON.parse(body);
            } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON" }));
                return resolve({ ok: false });
            }

            if (parsed.version === "nz-routing-crypto-01") {
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

    // POST /send
    if (req.method === "POST" && req.url === "/send") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { to, message } = payload || {};
            if (!to || !message) throw new Error();

            const entry = storeMessage(to, message);

            res.writeHead(200);
            return res.end(JSON.stringify({
                to: entry.to,
                message: entry.message
            }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid message" }));
        }
    }

    // GET /messages
    if (req.method === "GET" && req.url === "/messages") {
        res.writeHead(200);
        return res.end(JSON.stringify(listMessages()));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

// -------------------------------
// Startup
// -------------------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`P2P Messaging Microservice running on http://0.0.0.0:${PORT}`);
});