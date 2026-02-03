// Module: Logging Microservice HTTP Server
// Description: Minimal in-memory log collector API for NewZoneReference with full crypto-routing + discovery trust-store.
// Run: node server.js
// File: server.js

const http = require("http");
const { addLog, getLogs } = require("./index.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.logging;

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
    // GET /logs — list logs (test expects this)
    // -------------------------------
    if (req.method === "GET" && req.url === "/logs") {
        res.writeHead(200);
        return res.end(JSON.stringify(getLogs(100)));
    }

    // -------------------------------
    // POST /write — add log entry (test expects this)
    // -------------------------------
    if (req.method === "POST" && req.url === "/write") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { level, message } = payload || {};
            const entry = addLog("logging", level, { message });

            res.writeHead(200);
            return res.end(JSON.stringify({ level, message }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
    }

    // -------------------------------
    // Legacy endpoints (still supported)
    // -------------------------------
    if (req.method === "GET" && req.url.startsWith("/events")) {
        const limit = Number(req.url.split("?limit=")[1]) || 100;
        res.writeHead(200);
        return res.end(JSON.stringify(getLogs(limit)));
    }

    if (req.method === "POST" && req.url === "/log") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { source, event, payload: inner } = payload || {};
            const entry = addLog(source, event, inner);

            res.writeHead(200);
            return res.end(JSON.stringify(entry));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid JSON" }));
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
    console.log(`Logging Microservice running on http://0.0.0.0:${PORT}`);
});