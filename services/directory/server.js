// Module: Directory / Discovery Microservice HTTP Server
// Description: Minimal service registry API for NewZoneReference.
// Run: node server.js
// File: server.js

const http = require("http");
const {
    registerService,
    listServices,
    findByRole,
    removeService
} = require("./index.js");

const PORT = process.env.PORT || 3009;

const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    // Healthcheck
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: "ok" }));
    }

    // POST /register
    if (req.method === "POST" && req.url === "/register") {
        let body = "";
        req.on("data", chunk => (body += chunk));

        req.on("end", () => {
            try {
                const { role, url } = JSON.parse(body);
                const entry = registerService(role, url);

                res.writeHead(200);
                res.end(JSON.stringify(entry));
            } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid registration" }));
            }
        });

        return;
    }

    // GET /services
    if (req.method === "GET" && req.url === "/services") {
        res.writeHead(200);
        return res.end(JSON.stringify(listServices()));
    }

    // GET /services/<role>
    if (req.method === "GET" && req.url.startsWith("/services/")) {
        const role = req.url.split("/services/")[1];
        const list = findByRole(role);

        res.writeHead(200);
        return res.end(JSON.stringify(list));
    }

    // DELETE /services/<id>
    if (req.method === "DELETE" && req.url.startsWith("/services/")) {
        const id = req.url.split("/services/")[1];
        removeService(id);

        res.writeHead(200);
        return res.end(JSON.stringify({ removed: id }));
    }

    // Not found
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Directory Microservice running on http://0.0.0.0:${PORT}`);
});