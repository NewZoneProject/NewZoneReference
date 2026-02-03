// Module: Routing Microservice Core
// Description: Minimal message router for NewZoneReference (stateless forward + route resolution).
// File: index.js

const http = require("http");
const { PORTS } = require("../../config/ports.js");

/**
 * Forward message to target service
 * Returns: { status, body }
 */
function forward(host, port, path, method, body = null) {
    return new Promise(resolve => {
        const req = http.request(
            {
                hostname: host,
                port,
                path,
                method,
                headers: { "Content-Type": "application/json" }
            },
            res => {
                let data = "";
                res.on("data", chunk => (data += chunk));
                res.on("end", () => {
                    let parsed = {};
                    try {
                        parsed = JSON.parse(data);
                    } catch {
                        parsed = { error: "Invalid JSON from target" };
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
                body: { error: "Forward error", detail: err.message }
            });
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

/**
 * Determine route based on "target" field
 */
function resolveRoute(target) {
    const routes = {
        identity:  { host: "localhost", port: PORTS.identity },
        metadata:  { host: "localhost", port: PORTS.metadata },
        consensus: { host: "localhost", port: PORTS.consensus },
        storage:   { host: "localhost", port: PORTS.storage },
        event:     { host: "localhost", port: PORTS.event }   // ← ДОБАВЛЕНО
    };

    return routes[target] || null;
}

module.exports = {
    forward,
    resolveRoute
};