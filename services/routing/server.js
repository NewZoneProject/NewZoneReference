/**
 * Routing Microservice REST API
 * Minimal message router for NewZoneReference
 */

import http from "http";
import { resolveRoute, forward } from "./index.js";

const PORT = process.env.PORT || 3005;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // Only POST /route is supported
  if (req.method === "POST" && req.url === "/route") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", async () => {
      try {
        const { target, path, payload } = JSON.parse(body);

        const route = resolveRoute(target);
        if (!route) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: "Unknown target" }));
        }

        const result = await forward(route.host, route.port, path, "POST", payload);

        res.writeHead(200);
        res.end(JSON.stringify({
          hop: "routing-service",
          target,
          result
        }));

      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });

  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Routing Microservice running on http://localhost:${PORT}`);
});