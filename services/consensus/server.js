// Module: Consensus Microservice HTTP Server
// Description: Hybrid consensus API: proposals + cryptographic proofs with full crypto-routing and discovery trust-store.
// Run: node server.js
// File: server.js

const http = require("http");
const { generateConsensusProof, verifyConsensusProof } = require("./index.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { autoRegister, startHeartbeat } = require("../../lib/nz-lib.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.consensus;
const SERVICE_ROLE = "consensus";

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
// In-memory proposals store
// -------------------------------
const proposals = {};

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

    // ------------------------------------
    // High-level consensus: proposals API
    // ------------------------------------

    if (req.method === "POST" && req.url === "/propose") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        if (!payload || typeof payload !== "object") {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid request" }));
        }

        const { id, topic, payload: innerPayload } = payload;

        if (!id || !topic) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Missing id or topic" }));
        }

        try {
            const proof = generateConsensusProof(innerPayload);

            proposals[id] = {
                id,
                topic,
                payload: innerPayload,
                proof,
                status: "pending"
            };

            logEvent("consensus", "proposal_created", { id, topic });

            res.writeHead(200);
            return res.end(JSON.stringify({
                id,
                topic,
                payload: innerPayload,
                proof,
                status: proposals[id].status
            }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid request" }));
        }
    }

    if (req.method === "GET" && req.url.startsWith("/status/")) {
        const id = req.url.split("/")[2];
        const entry = proposals[id];

        if (!entry) {
            res.writeHead(200);
            return res.end(JSON.stringify({ id, status: "pending" }));
        }

        res.writeHead(200);
        return res.end(JSON.stringify({
            id: entry.id,
            topic: entry.topic,
            proof: entry.proof,
            status: entry.status
        }));
    }

    // ------------------------------------
    // Low-level cryptographic API
    // ------------------------------------

    if (req.method === "POST" && req.url === "/generate") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { payload: inner } = payload || {};
            const proof = generateConsensusProof(inner);

            logEvent("consensus", "consensus_generated", { proof_id: proof });

            res.writeHead(200);
            return res.end(JSON.stringify({ proof_id: proof }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid request" }));
        }
    }

    if (req.method === "POST" && req.url === "/verify") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { payload: inner, proof_id, id } = payload || {};
            const valid = verifyConsensusProof(inner, proof_id);

            if (id && proposals[id]) {
                proposals[id].status = valid ? "accepted" : "rejected";
                logEvent("consensus", "proposal_verified", { id, valid });
            } else {
                logEvent("consensus", "consensus_verified", { proof_id, valid });
            }

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
    console.log(`Consensus Microservice running on http://0.0.0.0:${PORT}`);

    autoRegister(SERVICE_ROLE, PORT);
    startHeartbeat(SERVICE_ROLE, PORT, 10000);
});