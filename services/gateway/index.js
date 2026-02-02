// Module: Gateway Microservice Core
// Description: Minimal unified proxy router for NewZoneReference cluster.
// File: index.js

const http = require("http");

/**
 * Proxy request to target microservice
 * @param {string} host
 * @param {number} port
 * @param {string} path
 * @param {string} method
 * @param {object|null} body
 * @returns {Promise<object>}
 */
function proxyRequest(host, port, path, method, body = null) {
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
                    resolve({ error: "Invalid response from service" });
                }
            });
        });

        req.on("error", reject);

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

module.exports = {
    proxyRequest
};