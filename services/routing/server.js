// Module: Routing Microservice HTTP Server
// Description: Minimal message router for NewZoneReference with full crypto-routing + discovery trust-store.
// Run: node server.js
// File: server.js

const http = require("http");
const { resolveRoute, forward } = require("./index.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { autoRegister, startHeartbeat } = require("../../lib/nz-lib.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.routing;
const SERVICE_ROLE = "routing";

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

                return resolve({ ok: true, payload: result.payload });
            }

            // Soft-mode
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
    // POST /route — main router entrypoint
    // -------------------------------
    if (req.method === "POST" && req.url === "/route") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const target = payload.target || payload.service;
            const path = payload.path;
            const method = payload.method || "POST";

            // Correct body extraction
            const inner = payload.body || {};

            const route = resolveRoute(target);
            if (!route) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: "Unknown target" }));
            }

            // Forward request and receive { status, body }
            const result = await forward(
                route.host,
                route.port,
                path,
                method,
                inner
            );

            // Correctly proxy status code and body
            res.writeHead(result.status);
            return res.end(JSON.stringify(result.body));

        } catch (err) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid request" }));
        }
    }

    // Not found
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

// -------------------------------
// Startup: register + heartbeat
// -------------------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Routing Microservice running on http://0.0.0.0:${PORT}`);

    autoRegister(SERVICE_ROLE, PORT);
    startHeartbeat(SERVICE_ROLE, PORT, 10000);
});