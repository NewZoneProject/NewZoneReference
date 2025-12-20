import http from "http";
import { checkServices, getRecentEvents } from "./index.js";

const PORT = process.env.PORT || 3007;
const START_TIME = Date.now();

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // GET /services — aggregated health
  if (req.method === "GET" && req.url === "/services") {
    const status = await checkServices();
    res.writeHead(200);
    return res.end(JSON.stringify(status));
  }

  // GET /metrics — uptime + events + service status
  if (req.method === "GET" && req.url === "/metrics") {
    const uptime = Date.now() - START_TIME;
    const status = await checkServices();
    const events = await getRecentEvents(50);

    res.writeHead(200);
    return res.end(JSON.stringify({
      uptime_ms: uptime,
      services: status,
      recent_events: events
    }));
  }

  // GET /status — human-readable summary
  if (req.method === "GET" && req.url === "/status") {
    const status = await checkServices();
    const ok = Object.values(status).every(s => s.ok);

    res.writeHead(200);
    return res.end(JSON.stringify({
      cluster: ok ? "healthy" : "degraded",
      services: status
    }));
  }

  // Not found
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Monitoring Microservice running on http://localhost:${PORT}`);
});