// Module: Rules Microservice HTTP Server
// Description: History rule processor for NewZoneReference (queue → rules → replication/logging/analytics).
// Run: node server.js
// File: server.js

const http = require("http");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { autoRegister, startHeartbeat } = require("../../lib/nz-lib.js");
const { PORTS } = require("../../config/ports.js");
const { forward } = require("../routing/index.js");
const { setHistoryRule, getHistoryRule, evaluateRules } = require("./index.js");

const PORT = PORTS.rules;
const SERVICE_ROLE = "rules";

// -------------------------------
// In-memory rule store (for /set /get API)
// -------------------------------
const RULES = {}; // key → value

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
// Background: process history queue
// -------------------------------
async function processHistoryQueue() {
    try {
        const result = await forward(
            "localhost",
            PORTS.queue,
            "/dequeue",
            "POST",
            { queue: "history" }
        );

        if (result.status === 200 && result.body && !result.body.empty) {
            // Queue item shape: { ts, payload: { hash_id, payload } }
            const context = result.body.payload || {};
            await evaluateRules(context);
        }
    } catch {
        // soft-fail, retry on next tick
    }

    setTimeout(processHistoryQueue, 200);
}

processHistoryQueue();

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
    // POST /set — store rule (B1: history_rule config)
// -------------------------------
    if (req.method === "POST" && req.url === "/set") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { key, value } = payload || {};
            if (!key) throw new Error();

            RULES[key] = value;

            // Special key: history_rule → update core config
            if (key === "history_rule") {
                setHistoryRule(value);
            }

            res.writeHead(200);
            return res.end(JSON.stringify({ key, value }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid rule" }));
        }
    }

    // -------------------------------
    // GET /get/<key> — return stored rule
    // -------------------------------
    if (req.method === "GET" && req.url.startsWith("/get/")) {
        const key = req.url.slice(5);

        if (!(key in RULES)) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "Not found" }));
        }

        res.writeHead(200);
        return res.end(JSON.stringify({ key, value: RULES[key] }));
    }

    // Optional: GET /config — debug current history_rule
    if (req.method === "GET" && req.url === "/config") {
        res.writeHead(200);
        return res.end(JSON.stringify(getHistoryRule()));
    }

    // Not found
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

// -------------------------------
// Startup
// -------------------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Rules Microservice running on http://0.0.0.0:${PORT}`);

    autoRegister(SERVICE_ROLE, PORT);
    startHeartbeat(SERVICE_ROLE, PORT, 10000);
});