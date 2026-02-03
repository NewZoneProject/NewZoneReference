// Module: State Microservice HTTP Server
// Description: Minimal key-value state store API for NewZoneReference with full crypto-routing + discovery trust-store.
// Run: node server.js
// File: server.js

const http = require("http");
const {
    setState,
    getState,
    deleteState,
    listKeys
} = require("./index.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { autoRegister, startHeartbeat } = require("../../lib/nz-lib.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.state;
const SERVICE_ROLE = "state";

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

    // POST /set — set state value
    if (req.method === "POST" && req.url === "/set") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { key, value } = payload || {};
            const result = setState(key, value);

            res.writeHead(200);
            return res.end(JSON.stringify({ key, value: result.value }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid state" }));
        }
    }

    // GET /get/<key>
    if (req.method === "GET" && req.url.startsWith("/get/")) {
        const key = req.url.split("/get/")[1];
        const result = getState(key);

        if (result !== null) {
            res.writeHead(200);
            return res.end(JSON.stringify({
                key,
                value: result.value
            }));
        }

        res.writeHead(404);
        return res.end(JSON.stringify({ error: "Not found" }));
    }

    // DELETE /delete/<key>
    if (req.method === "DELETE" && req.url.startsWith("/delete/")) {
        const key = req.url.split("/delete/")[1];
        deleteState(key);

        res.writeHead(200);
        return res.end(JSON.stringify({ removed: key }));
    }

    // GET /keys
    if (req.method === "GET" && req.url === "/keys") {
        res.writeHead(200);
        return res.end(JSON.stringify(listKeys()));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

// -------------------------------
// Startup: register + heartbeat
// -------------------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`State Microservice running on http://0.0.0.0:${PORT}`);

    autoRegister(SERVICE_ROLE, PORT);
    startHeartbeat(SERVICE_ROLE, PORT, 10000);
});