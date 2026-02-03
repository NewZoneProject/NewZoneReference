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
    nodeKeys = null;
    nodeId = null;
}

/**
 * Proxy request to target microservice
 * Returns: { status, body }
 */
function proxyRequest(host, port, path, method, body = null, sign = false) {
    return new Promise(resolve => {
        let finalBody = "";

        if (sign && nodeKeys) {
            finalBody = JSON.stringify(
                signRoutingPacket({
                    nodeId,
                    privateKey: nodeKeys.private_key,
                    payload: body
                })
            );
        } else {
            finalBody = body ? JSON.stringify(body) : "";
        }

        const req = http.request(
            {
                hostname: host,
                port,
                path,
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(finalBody)
                }
            },
            res => {
                let data = "";
                res.on("data", chunk => (data += chunk));
                res.on("end", () => {
                    let parsed = {};
                    try {
                        parsed = JSON.parse(data);
                    } catch {
                        parsed = { error: "Invalid JSON from service" };
                    }

                    resolve({
                        status: res.statusCode,
                        body: parsed
                    });
                });
            }
        );

        req.on("error", err => {
            resolve({
                status: 500,
                body: { error: "Gateway forward error", detail: err.message }
            });
        });

        if (finalBody) req.write(finalBody);
        req.end();
    });
}

module.exports = {
    proxyRequest
};