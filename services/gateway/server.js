// Module: Gateway Microservice HTTP Server
// Description: Stateless crypto firewall + unified proxy router for NewZoneReference.
// Run: node server.js
// File: server.js

const http = require("http");
const { proxyRequest } = require("./index.js");
const { decryptPacket, verifySignedPacket } = require("../../lib/nz-crypto.js");
const { verifyRoutingPacket } = require("../../lib/nz-crypto-routing.js");
const { autoRegister, startHeartbeat } = require("../../lib/nz-lib.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.gateway;
const SERVICE_ROLE = "gateway";

// -------------------------------
// Dynamic trust-store
// -------------------------------
let knownNodes = {};

const sessionKey = new Uint8Array(32);

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
                try { knownNodes = JSON.parse(data); } catch {}
            });
        });
        req.on("error", () => {});
    } catch {}
}

setInterval(updateKnownNodes, 5000);
updateKnownNodes();

// -------------------------------
// Direct routes
// -------------------------------
const ROUTES = {
    "/identity":  { host: "localhost", port: PORTS.identity },
    "/metadata":  { host: "localhost", port: PORTS.metadata },
    "/consensus": { host: "localhost", port: PORTS.consensus },
    "/storage":   { host: "localhost", port: PORTS.storage }
};

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
    // POST /verify — crypto verification
    // -------------------------------
    if (req.method === "POST" && req.url === "/verify") {
        let body = "";
        req.on("data", chunk => (body += chunk));

        req.on("end", async () => {
            try {
                const packet = JSON.parse(body);

                const signed = packet.version === "nz-crypto-01"
                    ? await decryptPacket({ packet, sessionKey })
                    : packet;

                const result = await verifySignedPacket({
                    packet: signed,
                    getPublicKeyByNodeId,
                    isNonceSeen: null,
                    maxSkewSec: 300
                });

                if (!result.ok) {
                    res.writeHead(403);
                    return res.end(JSON.stringify({ error: result.reason }));
                }

                res.writeHead(200);
                return res.end(JSON.stringify({ ok: true, node_id: result.node_id }));
            } catch {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: "Invalid crypto packet" }));
            }
        });

        return;
    }

    // -------------------------------
    // POST /route — passthrough to routing-service
    // -------------------------------
    if (req.method === "POST" && req.url === "/route") {
        let body = "";
        req.on("data", chunk => (body += chunk));

        req.on("end", async () => {
            try {
                const parsed = JSON.parse(body);

                const result = await proxyRequest(
                    "localhost",
                    PORTS.routing,
                    "/route",
                    "POST",
                    parsed
                );

                res.writeHead(result.status);
                return res.end(JSON.stringify(result.body));

            } catch {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: "Invalid request" }));
            }
        });

        return;
    }

    // -------------------------------
    // Direct proxy routes
    // -------------------------------
    const prefix = Object.keys(ROUTES).find(p => req.url.startsWith(p));
    if (!prefix) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: "Unknown route" }));
    }

    const { host, port } = ROUTES[prefix];
    const path = req.url.replace(prefix, "");

    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", async () => {
        let parsed = null;

        if (body) {
            try { parsed = JSON.parse(body); }
            catch {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        }

        // Crypto-routing strict mode
        if (parsed && parsed.version === "nz-routing-crypto-01") {
            const result = await verifyRoutingPacket({
                packet: parsed,
                getPublicKeyByNodeId,
                maxSkewSec: 300
            });

            if (!result.ok) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: result.reason }));
            }

            parsed = result.payload;
        }

        try {
            const result = await proxyRequest(host, port, path, req.method, parsed);

            res.writeHead(result.status);
            return res.end(JSON.stringify(result.body));

        } catch {
            res.writeHead(500);
            return res.end(JSON.stringify({ error: "Gateway error" }));
        }
    });
});

// -------------------------------
// Startup
// -------------------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Gateway Microservice running on http://0.0.0.0:${PORT}`);

    autoRegister(SERVICE_ROLE, PORT);
    startHeartbeat(SERVICE_ROLE, PORT, 10000);
});