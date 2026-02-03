// Module: Storage Microservice HTTP Server (Hybrid KV + CAS)
// Description: Unified storage layer for NewZoneReference.
// Run: node server.js
// File: server.js

const http = require("http");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { autoRegister, startHeartbeat } = require("../../lib/nz-lib.js");
const { PORTS } = require("../../config/ports.js");

// CAS core
const CAS = require("./index.js"); // generateHash, storeObject, getObject, verifyObject

const PORT = PORTS.storage;
const SERVICE_ROLE = "storage";

// -------------------------------
// KV store (mutable state)
// -------------------------------
const STORE_KV = {}; // key → value

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

    // ============================================================
    // KV MODE (mutable state)
    // ============================================================

    // POST /kv/set
    if (req.method === "POST" && req.url === "/kv/set") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        const { key, value } = payload || {};
        if (!key) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Missing key" }));
        }

        STORE_KV[key] = value;

        res.writeHead(200);
        return res.end(JSON.stringify({ key, value }));
    }

    // GET /kv/get/<key>
    if (req.method === "GET" && req.url.startsWith("/kv/get/")) {
        const key = req.url.slice("/kv/get/".length);

        if (!(key in STORE_KV)) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "Not found" }));
        }

        res.writeHead(200);
        return res.end(JSON.stringify({ key, value: STORE_KV[key] }));
    }

    // ============================================================
    // CAS MODE (immutable objects)
    // ============================================================

    // POST /cas/store
    if (req.method === "POST" && req.url === "/cas/store") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        if (!payload || typeof payload !== "object") {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid object" }));
        }

        const hash_id = CAS.storeObject(payload);

        res.writeHead(200);
        return res.end(JSON.stringify({ hash_id }));
    }

    // GET /cas/get/<hash_id>
    if (req.method === "GET" && req.url.startsWith("/cas/get/")) {
        const hash_id = req.url.slice("/cas/get/".length);

        const obj = CAS.getObject(hash_id);
        if (!obj) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "Not found" }));
        }

        res.writeHead(200);
        return res.end(JSON.stringify(obj));
    }

    // POST /cas/verify
    if (req.method === "POST" && req.url === "/cas/verify") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        const { object, hash_id } = payload || {};
        if (!object || !hash_id) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Missing object or hash_id" }));
        }

        const valid = CAS.verifyObject(object, hash_id);

        res.writeHead(200);
        return res.end(JSON.stringify({ ok: valid }));
    }

    // Not found
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

// -------------------------------
// Startup
// -------------------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Storage Microservice (Hybrid) running on http://0.0.0.0:${PORT}`);

    autoRegister(SERVICE_ROLE, PORT);
    startHeartbeat(SERVICE_ROLE, PORT, 10000);
});