// Module: Metadata Microservice HTTP Server
// Description: Stateless metadata store + metadata proof API with crypto-routing soft-mode.
// Run: node server.js
// File: server.js

const http = require("http");
const { generateMetadataProof, verifyMetadataProof } = require("./index.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { autoRegister, startHeartbeat } = require("../../lib/nz-lib.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.metadata;
const SERVICE_ROLE = "metadata";

// -------------------------------
// In-memory metadata store
// -------------------------------
const store = {}; // { key: value }

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
// Optional logging (non-blocking)
// -------------------------------
async function logEvent(source, event, payload = null) {
    try {
        await fetch(`http://localhost:${PORTS.logging}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source, event, payload })
        });
    } catch {}
}

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

            // Crypto-routing soft mode
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

            // Plain JSON
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
    // POST /set — store metadata key/value
    // -------------------------------
    if (req.method === "POST" && req.url === "/set") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { key, value } = payload || {};
            if (!key) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: "Missing key" }));
            }

            store[key] = value;

            logEvent("metadata", "metadata_set", { key, value });

            res.writeHead(200);
            return res.end(JSON.stringify({ key, value }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid request" }));
        }
    }

    // -------------------------------
    // GET /get/:key — retrieve metadata
    // -------------------------------
    if (req.method === "GET" && req.url.startsWith("/get/")) {
        const key = req.url.slice("/get/".length);

        if (!(key in store)) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "Not found" }));
        }

        const value = store[key];

        res.writeHead(200);
        return res.end(JSON.stringify({ key, value }));
    }

    // -------------------------------
    // POST /generate — create metadata proof
    // -------------------------------
    if (req.method === "POST" && req.url === "/generate") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { metadata } = payload || {};
            const proof = generateMetadataProof(metadata);

            logEvent("metadata", "metadata_proof_generated", { proof_id: proof });

            res.writeHead(200);
            return res.end(JSON.stringify({ proof_id: proof }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid request" }));
        }
    }

    // -------------------------------
    // POST /verify — verify metadata proof
    // -------------------------------
    if (req.method === "POST" && req.url === "/verify") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { metadata, proof_id } = payload || {};
            const valid = verifyMetadataProof(metadata, proof_id);

            logEvent("metadata", "metadata_verified", { proof_id, valid });

            res.writeHead(200);
            return res.end(JSON.stringify({ valid }));
        } catch {
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
    console.log(`Metadata Microservice running on http://0.0.0.0:${PORT}`);

    autoRegister(SERVICE_ROLE, PORT);
    startHeartbeat(SERVICE_ROLE, PORT, 10000);
});