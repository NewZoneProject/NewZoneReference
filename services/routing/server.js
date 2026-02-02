// Module: Routing Microservice HTTP Server
// Description: Minimal message router for NewZoneReference.
// Run: node server.js
// File: server.js

const http = require("http");
const { resolveRoute, forward } = require("./index.js");

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

                const result = await forward(
                    route.host,
                    route.port,
                    path,
                    "POST",
                    payload
                );

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

        return;
    }

    // Not found
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Routing Microservice running on http://0.0.0.0:${PORT}`);
});