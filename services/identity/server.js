// Module: Identity Microservice HTTP Server
// Description: Stateless ID generation and verification API for NewZoneReference.
// Run: node server.js
// File: server.js

const http = require("http");
const { generateIdentity, verifyIdentity } = require("./index.js");

const PORT = process.env.PORT || 3000;

// Optional logging (non-blocking)
async function logEvent(source, event, payload = null) {
    try {
        await fetch("http://logging-service:3006/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source, event, payload })
        });
    } catch {
        // Logging is optional — ignore errors
    }
}

const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    // Healthcheck
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: "ok" }));
    }

    // POST /generate
    if (req.method === "POST" && req.url === "/generate") {
        let body = "";
        req.on("data", chunk => (body += chunk));

        req.on("end", () => {
            try {
                const { input } = JSON.parse(body);
                const id = generateIdentity(input);

                // Non-blocking logging
                logEvent("identity", "identity_generated", { id });

                res.writeHead(200);
                res.end(JSON.stringify({ identity_id: id }));
            } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid request" }));
            }
        });

        return;
    }

    // POST /verify
    if (req.method === "POST" && req.url === "/verify") {
        let body = "";
        req.on("data", chunk => (body += chunk));

        req.on("end", () => {
            try {
                const { input, identity_id } = JSON.parse(body);
                const valid = verifyIdentity(input, identity_id);

                // Optional logging
                logEvent("identity", "identity_verified", { identity_id, valid });

                res.writeHead(200);
                res.end(JSON.stringify({ valid }));
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
    console.log(`Identity Microservice running on http://0.0.0.0:${PORT}`);
});