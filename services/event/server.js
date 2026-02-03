// Module: Event Microservice HTTP Server
// Description: Stateless event bus API (publish, list, subscribe) with full crypto-routing + discovery trust-store.
// Run: node server.js
// File: server.js

const http = require("http");
const {
    publishEvent,
    getEvents,
    addSubscription,
    removeSubscription,
    listSubscriptions
} = require("./index.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { autoRegister, startHeartbeat } = require("../../lib/nz-lib.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.event;
const SERVICE_ROLE = "event";

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

    // POST /event — publish event
    if (req.method === "POST" && req.url === "/event") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { type, source, payload: inner } = payload || {};
            const event = publishEvent(type, source, inner);

            res.writeHead(200);
            return res.end(JSON.stringify({ ok: true, event }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid event" }));
        }
    }

    // GET /events — list events
    if (req.method === "GET" && req.url.startsWith("/events")) {
        const url = new URL(req.url, "http://localhost");
        const type = url.searchParams.get("type");
        const limit = Number(url.searchParams.get("limit") || 50);

        const events = getEvents(type, limit);

        res.writeHead(200);
        return res.end(JSON.stringify(events));
    }

    // POST /subscribe — add subscription
    if (req.method === "POST" && req.url === "/subscribe") {
        const { ok, payload } = await parseRequestBodyWithCrypto(req, res);
        if (!ok) return;

        try {
            const { type, callback } = payload || {};
            const id = addSubscription(type, callback);

            res.writeHead(200);
            return res.end(JSON.stringify({ subscription_id: id }));
        } catch {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Invalid subscription" }));
        }
    }

    // GET /subscriptions — list subscriptions
    if (req.method === "GET" && req.url === "/subscriptions") {
        res.writeHead(200);
        return res.end(JSON.stringify(listSubscriptions()));
    }

    // DELETE /subscriptions/<id>
    if (req.method === "DELETE" && req.url.startsWith("/subscriptions/")) {
        const id = req.url.split("/subscriptions/")[1];
        removeSubscription(id);

        res.writeHead(200);
        return res.end(JSON.stringify({ removed: id }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

// -------------------------------
// Startup: register + heartbeat
// -------------------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Event Microservice running on http://0.0.0.0:${PORT}`);

    autoRegister(SERVICE_ROLE, PORT);
    startHeartbeat(SERVICE_ROLE, PORT, 10000);
});