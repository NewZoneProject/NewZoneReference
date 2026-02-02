// Module: Analytics Microservice HTTP Server
// Description: Provides metrics, recomputation, and summary endpoints for analytics.
// Run: node server.js
// File: server.js

const http = require("http");
const { recomputeMetrics, getMetrics } = require("./index.js");

const PORT = process.env.PORT || 3012;

const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    // Healthcheck
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: "ok" }));
    }

    // GET /metrics — return current metrics without recompute
    if (req.method === "GET" && req.url === "/metrics") {
        res.writeHead(200);
        return res.end(JSON.stringify(getMetrics()));
    }

    // POST /recompute — recompute metrics now
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

    // GET /summary — compact overview
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

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Analytics Microservice running on http://0.0.0.0:${PORT}`);
});