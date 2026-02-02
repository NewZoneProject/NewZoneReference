// Module: Consensus Microservice HTTP Server
// Description: Stateless consensus proof generation and verification API.
// Run: node server.js
// File: server.js

const http = require("http");
const { generateConsensusProof, verifyConsensusProof } = require("./index.js");

// Non-blocking logging helper
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

const PORT = process.env.PORT || 3002;

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
                const { payload } = JSON.parse(body);
                const proof = generateConsensusProof(payload);

                // Non-blocking logging
                logEvent("consensus", "consensus_generated", { proof_id: proof });

                res.writeHead(200);
                res.end(JSON.stringify({ proof_id: proof }));
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
                const { payload, proof_id } = JSON.parse(body);
                const valid = verifyConsensusProof(payload, proof_id);

                // Optional logging
                logEvent("consensus", "consensus_verified", { proof_id, valid });

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
    console.log(`Consensus Microservice running on http://0.0.0.0:${PORT}`);
});