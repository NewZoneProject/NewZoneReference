// Module: Discovery Microservice HTTP + UDP Server
// Description: Autonomous service discovery for NewZoneReference.
// Run: node server.js
// File: server.js

const http = require("http");
const path = require("path");
const {
    getLocalIP,
    createDiscoverySocket,
    broadcast
} = require("./index.js");
const { generateNodeKeysIfMissing } = require("../../lib/generate-node-keys.js");
const { PORTS } = require("../../config/ports.js");

const PORT = PORTS.discovery;
const UDP_PORT = 4000;

// Load or generate node keys
const nodeKeys = generateNodeKeysIfMissing(__dirname);
const nodeId = nodeKeys.node_id;

// Local service identity
const serviceName = path.basename(__dirname);
const localIP = getLocalIP();

// Known nodes
const knownNodes = {};

// UDP listener
const socket = createDiscoverySocket(UDP_PORT, (data) => {
    if (!data.node_id || !data.public_key || !data.service) return;

    knownNodes[data.node_id] = {
        public_key: data.public_key,
        service: data.service,
        ip: data.ip,
        port: data.port
    };
});

// Broadcast presence every 3 seconds
setInterval(() => {
    broadcast(socket, UDP_PORT, {
        node_id: nodeId,
        public_key: nodeKeys.ed25519_public,
        service: serviceName,
        ip: localIP,
        port: PORT
    });
}, 3000);

// HTTP server
const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    // Healthcheck
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: "ok" }));
    }

    // GET /nodes — return known nodes
    if (req.method === "GET" && req.url === "/nodes") {
        res.writeHead(200);
        return res.end(JSON.stringify(knownNodes));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Discovery Microservice running on http://0.0.0.0:${PORT}`);

    // Auto-register in directory
    try {
        fetch(`http://localhost:${PORTS.directory}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                role: "discovery",
                url: `http://localhost:${PORT}`
            })
        });
    } catch {
        // Directory may be down — ignore
    }
});