/**
 * Metadata Microservice REST API
 * Stateless metadata integrity proofs
 * Pure Node.js http server, no dependencies
 */

import http from "http";
import { generateMetadataProof, verifyMetadataProof } from "./index.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // Enable CORS + JSON headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "POST" && req.url === "/generate") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        const { metadata } = JSON.parse(body);
        const proof = generateMetadataProof(metadata);
        res.writeHead(200);
        res.end(JSON.stringify({ proof_id: proof }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
  } else if (req.method === "POST" && req.url === "/verify") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        const { metadata, proof_id } = JSON.parse(body);
        const valid = verifyMetadataProof(metadata, proof_id);
        res.writeHead(200);
        res.end(JSON.stringify({ valid }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Metadata Microservice running on http://localhost:${PORT}`);
});