// Module: Metadata Microservice HTTP Server
// Description: Stateless metadata proof generation and verification API.
// Run: node server.js
// File: server.js

const http = require("http");
const { generateMetadataProof, verifyMetadataProof } = require("./index.js");

const PORT = process.env.PORT || 3001;

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

    // POST /generate — create metadata proof
    if (req.method === "POST" && req.url === "/generate") {
        let body = "";
        req.on("data", chunk => (body += chunk));

        req.on("end", () => {
            try {
                const { metadata } = JSON.parse(body);
                const proof = generateMetadataProof(metadata);

                // Log event (non-blocking)
                logEvent("metadata", "metadata_proof_generated", { proof_id: proof });

                res.writeHead(200);
                res.end(JSON.stringify({ proof_id: proof }));
            } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid request" }));
            }
        });

        return;
    }

    // POST /verify — verify metadata proof
    if (req.method === "POST" && req.url === "/verify") {
        let body = "";
        req.on("data", chunk => (body += chunk));

        req.on("end", () => {
            try {
                const { metadata, proof_id } = JSON.parse(body);
                const valid = verifyMetadataProof(metadata, proof_id);

                // Log verification result
                logEvent("metadata", "metadata_verified", { proof_id, valid });

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
    console.log(`Metadata Microservice running on http://0.0.0.0:${PORT}`);
});