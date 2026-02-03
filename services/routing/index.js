// Module: Routing Microservice Core
// Description: Minimal message router for NewZoneReference (stateless forward + route resolution).
// File: index.js

const http = require("http");
const { PORTS } = require("../../config/ports.js");

/**
 * Forward message to target service
 * @param {string} host
 * @param {number} port
 * @param {string} path
 * @param {string} method
 * @param {object|null} body
 * @returns {Promise<object>}
 */
function forward(host, port, path, method, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: host,
            port,
            path,
            method,
            headers: { "Content-Type": "application/json" }
        };

        const req = http.request(options, res => {
            let data = "";
            res.on("data", chunk => (data += chunk));
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve({ error: "Invalid response from target" });
                }
            });
        });

        req.on("error", reject);

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

/**
 * Determine route based on "target" field
 * @param {string} target
 * @returns {{host: string, port: number}|null}
 */
function resolveRoute(target) {
    const routes = {
        identity:  { host: "localhost", port: PORTS.identity },
        metadata:  { host: "localhost", port: PORTS.metadata },
        consensus: { host: "localhost", port: PORTS.consensus },
        storage:   { host: "localhost", port: PORTS.storage }
    };

    return routes[target] || null;
}

module.exports = {
    forward,
    resolveRoute
};