import http from "http";
import { recomputeMetrics, getMetrics } from "./index.js";

const PORT = process.env.PORT || 3012;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // GET /metrics — вернуть текущие (без пересчёта)
  if (req.method === "GET" && req.url === "/metrics") {
    res.writeHead(200);
    return res.end(JSON.stringify(getMetrics()));
  }

  // POST /recompute — пересчитать метрики прямо сейчас
  if (req.method === "POST" && req.url === "/recompute") {
    try {
      const metrics = await recomputeMetrics();
      res.writeHead(200);
      return res.end(JSON.stringify(metrics));
    } catch {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: "Recompute failed" }));
    }
  }

  // GET /summary — удобный сжатый обзор
  if (req.method === "GET" && req.url === "/summary") {
    const m = getMetrics();

    res.writeHead(200);
    return res.end(JSON.stringify({
      total_events: m.total_events,
      sources: m.events_by_source,
      types: m.events_by_type,
      last_updated: m.last_updated
    }));
  }

  // Not found
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Analytics Microservice running on http://localhost:${PORT}`);
});