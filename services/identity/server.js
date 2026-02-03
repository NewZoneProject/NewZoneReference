// Module: Identity Microservice HTTP Server
// Description: Stateless identity API (Ed25519 keypair generation, deterministic ID, verification) with crypto-routing support.
// Run: node server.js
// File: server.js

const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const { generateIdentity, verifyIdentity } = require("./index.js");
const { proxyRequest } = require("../gateway/index.js");
const { signRoutingPacket, verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { autoRegister, startHeartbeat } = require("../../lib/nz-lib.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.identity;
const SERVICE_ROLE = "identity";

// -------------------------------
// Load node keys for crypto-routing signing
// -------------------------------
let nodeKeys = null;
let nodeId = null;

try {
    const raw = fs.readFileSync("./keys/node.json", "utf8");
    const parsed = JSON.parse(raw);
    nodeKeys = parsed;
    nodeId = parsed.node_id;
} catch {
    nodeKeys = null;
    nodeId = null;
}

// -------------------------------
// Dynamic trust-store (auto-updated from discovery)
// -------------------------------
let knownNodes = {};

async function getPublicKeyByNodeId(nodeIdLookup) {
    const entry = knownNodes[nodeIdLookup];
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
// Ed25519 keypair generator
// -------------------------------
function generateKeypair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

    return {
        public_key: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
        private_key: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64")
    };
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

    // POST /generate — Ed25519 keypair
    if (req.method === "POST" && req.url === "/generate") {
        try {
            const kp = generateKeypair();

            logEvent("identity", "keypair_generated", { public_key: kp.public_key });

            res.writeHead(200);
            return res.end(JSON.stringify(kp));
        } catch {
            res.writeHead(500);
            return res.end(JSON.stringify({ error: "Key generation failed" }));
        }
    }

    // POST /generate-id — deterministic identity ID
    if (req.method === "POST" && req.url === "/generate-id") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { input } = payload || {};
            const id = generateIdentity(input);

            logEvent("identity", "identity_generated", { id });

            res.writeHead(200);
            return res.end(JSON.stringify({ identity_id: id }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid request" }));
        }
    }

    // POST /verify-id — verify deterministic identity
    if (req.method === "POST" && req.url === "/verify-id") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { input, identity_id } = payload || {};
            const valid = verifyIdentity(input, identity_id);

            logEvent("identity", "identity_verified", { identity_id, valid });

            res.writeHead(200);
            return res.end(JSON.stringify({ valid }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid request" }));
        }
    }

    // POST /metadata-info — demo: signed crypto-routing request to metadata-service
    if (req.method === "POST" && req.url === "/metadata-info") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            if (!nodeKeys || !nodeId) {
                res.writeHead(500);
                return res.end(JSON.stringify({ error: "Node keys not loaded" }));
            }

            const signedPacket = signRoutingPacket({
                nodeKeys,
                nodeId,
                payload
            });

            const result = await proxyRequest(
                "localhost",
                PORTS.gateway,
                "/metadata/generate",
                "POST",
                signedPacket
            );

            res.writeHead(200);
            return res.end(JSON.stringify(result));
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
    console.log(`Identity Microservice running on http://0.0.0.0:${PORT}`);

    autoRegister(SERVICE_ROLE, PORT);
    startHeartbeat(SERVICE_ROLE, PORT, 10000);
});