// Module: Directory / Discovery Microservice HTTP Server
// Description: Minimal service registry API for NewZoneReference with full crypto-routing + discovery trust-store + heartbeat/TTL.
// Run: node server.js
// File: server.js

const http = require("http");
const {
    registerService,
    updateHeartbeat,
    listServices,
    findByRole,
    removeService
} = require("./index.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.directory;

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

    // POST /register — register service
    if (req.method === "POST" && req.url === "/register") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { role, url } = payload || {};
            const entry = registerService(role, url);

            res.writeHead(200);
            return res.end(JSON.stringify(entry));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid registration" }));
        }
    }

    // POST /heartbeat — update TTL + timestamp
    if (req.method === "POST" && req.url === "/heartbeat") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { role, url, ttl } = payload || {};
            const updated = updateHeartbeat(role, url, ttl);

            res.writeHead(200);
            return res.end(JSON.stringify({ ok: updated }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid heartbeat" }));
        }
    }

    // GET /services — list all services
    if (req.method === "GET" && req.url === "/services") {
        res.writeHead(200);
        return res.end(JSON.stringify(listServices()));
    }

    // GET /services/<role> — list by role
    if (req.method === "GET" && req.url.startsWith("/services/")) {
        const role = req.url.split("/services/")[1];
        const list = findByRole(role);

        res.writeHead(200);
        return res.end(JSON.stringify(list));
    }

    // DELETE /services/<id> — remove service
    if (req.method === "DELETE" && req.url.startsWith("/services/")) {
        const id = req.url.split("/services/")[1];
        removeService(id);

        res.writeHead(200);
        return res.end(JSON.stringify({ removed: id }));
    }

    // Not found
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

// -------------------------------
// Startup
// -------------------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Directory Microservice running on http://0.0.0.0:${PORT}`);
});