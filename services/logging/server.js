/**
 * Logging Microservice REST API
 * Minimal log collector for NewZoneReference
 */

import http from "http";
import { addLog, getLogs } from "./index.js";

const PORT = process.env.PORT || 3006;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // GET /events — return recent logs
  if (req.method === "GET" && req.url.startsWith("/events")) {
    const limit = Number(req.url.split("?limit=")[1]) || 100;
    res.writeHead(200);
    return res.end(JSON.stringify(getLogs(limit)));
  }

  // POST /log — add log entry
  if (req.method === "POST" && req.url === "/log") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const { source, event, payload } = JSON.parse(body);
        const entry = addLog(source, event, payload);
        res.writeHead(200);
        res.end(JSON.stringify(entry));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });

    return;
  }

  // Not found
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Logging Microservice running on http://localhost:${PORT}`);
});