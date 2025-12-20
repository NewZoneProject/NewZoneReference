/**
 * Routing Microservice
 * Minimal message router for NewZoneReference
 * Stateless, no dependencies
 */

import http from "http";

/**
 * Forward message to target service
 * @param {string} host
 * @param {number} port
 * @param {string} path
 * @param {string} method
 * @param {object|null} body
 * @returns {Promise<object>}
 */
export function forward(host, port, path, method, body = null) {
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
export function resolveRoute(target) {
  const routes = {
    identity:  { host: "identity-service",  port: 3000 },
    metadata:  { host: "metadata-service",  port: 3001 },
    consensus: { host: "consensus-service", port: 3002 },
    storage:   { host: "storage-service",   port: 3003 }
  };

  return routes[target] || null;
}