// Module: Gateway Microservice Core
// Description: Minimal unified proxy router with optional crypto-routing support for NewZoneReference cluster.
// File: index.js

const http = require("http");
const fs = require("fs");
const { signRoutingPacket } = require("../../lib/nz-crypto-routing.js");

// Load gateway node keys (for signing outgoing packets)
let nodeKeys = null;
let nodeId = null;

try {
    const raw = fs.readFileSync("./keys/node.json", "utf8");
    const parsed = JSON.parse(raw);
    nodeKeys = parsed;
    nodeId = parsed.node_id;
} catch {
    // If keys missing — signing disabled (soft mode)
    nodeKeys = null;
    nodeId = null;
}

/**
 * Proxy request to target microservice
 * @param {string} host
 * @param {number} port
 * @param {string} path
 * @param {string} method
 * @param {object|null} body
 * @param {boolean} sign - whether to wrap body into crypto-routing packet
 * @returns {Promise<object>}
 */
function proxyRequest(host, port, path, method, body = null, sign = false) {
    return new Promise((resolve, reject) => {
        let finalBody = body ? JSON.stringify(body) : "";

        const options = {
            hostname: host,
            port,
            path,
            method,
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(finalBody)
            }
        };

        const req = http.request(options, res => {
            let data = "";
            res.on("data", chunk => (data += chunk));
            res.on("end", () => {
                if (!data) return resolve({}); // empty response

                try {
                    resolve(JSON.parse(data)); // raw identity response
                } catch {
                    resolve({ error: "Invalid JSON from service" });
                }
            });
        });

        req.on("error", reject);

        if (finalBody) req.write(finalBody);
        req.end();
    });
}

module.exports = {
    proxyRequest
};