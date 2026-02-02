// Module: Queue Microservice HTTP Server
// Description: Minimal FIFO queue API for NewZoneReference.
// Run: node server.js
// File: server.js

const http = require("http");
const {
    enqueue,
    dequeue,
    peek,
    listQueues
} = require("./index.js");

const PORT = process.env.PORT || 3013;

const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    // Healthcheck
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: "ok" }));
    }

    // POST /enqueue
    if (req.method === "POST" && req.url === "/enqueue") {
        let body = "";
        req.on("data", chunk => (body += chunk));

        req.on("end", () => {
            try {
                const { queue, payload } = JSON.parse(body);
                const item = enqueue(queue, payload);

                res.writeHead(200);
                res.end(JSON.stringify(item));
            } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid enqueue" }));
            }
        });

        return;
    }

    // POST /dequeue
    if (req.method === "POST" && req.url === "/dequeue") {
        let body = "";
        req.on("data", chunk => (body += chunk));

        req.on("end", () => {
            try {
                const { queue } = JSON.parse(body);
                const item = dequeue(queue);

                res.writeHead(200);
                res.end(JSON.stringify(item || { empty: true }));
            } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid dequeue" }));
            }
        });

        return;
    }

    // GET /peek?queue=name&limit=10
    if (req.method === "GET" && req.url.startsWith("/peek")) {
        const url = new URL(req.url, "http://localhost");
        const queue = url.searchParams.get("queue");
        const limit = Number(url.searchParams.get("limit") || 10);

        const items = peek(queue, limit);

        res.writeHead(200);
        return res.end(JSON.stringify(items));
    }

    // GET /queues
    if (req.method === "GET" && req.url === "/queues") {
        res.writeHead(200);
        return res.end(JSON.stringify(listQueues()));
    }

    // Not found
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Queue Microservice running on http://0.0.0.0:${PORT}`);
});