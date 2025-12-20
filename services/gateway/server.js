/**
 * Gateway Microservice REST API
 * Unified entrypoint for Identity, Metadata, Consensus, Storage
 * Pure Node.js http server, no dependencies
 */

import http from "http";
import { proxyRequest } from "./index.js";

const PORT = process.env.PORT || 3004;

// Mapping: prefix → service host/port
const ROUTES = {
  "/identity": { host: "identity-service", port: 3000 },
  "/metadata": { host: "metadata-service", port: 3001 },
  "/consensus": { host: "consensus-service", port: 3002 },
  "/storage": { host: "storage-service", port: 3003 }
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Find matching prefix
  const prefix = Object.keys(ROUTES).find(p => req.url.startsWith(p));
  if (!prefix) {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: "Unknown route" }));
  }

  const { host, port } = ROUTES[prefix];
  const path = req.url.replace(prefix, "");

  // Read body if POST
  let body = "";
  req.on("data", chunk => (body += chunk));

  req.on("end", async () => {
    let parsed = null;
    if (body) {
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    }

    try {
      const result = await proxyRequest(host, port, path, req.method, parsed);
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Gateway error" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Gateway Microservice running on http://localhost:${PORT}`);
});