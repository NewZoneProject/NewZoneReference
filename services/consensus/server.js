/**
 * Consensus Microservice REST API
 * Stateless consensus integrity proofs
 * Pure Node.js http server, no dependencies
 */

import http from "http";
import { generateConsensusProof, verifyConsensusProof } from "./index.js";

const PORT = process.env.PORT || 3002;

const server = http.createServer(async (req, res) => {
  // Enable CORS + JSON headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  if (req.method === "POST" && req.url === "/generate") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        const { payload } = JSON.parse(body);
        const proof = generateConsensusProof(payload);
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
        const { payload, proof_id } = JSON.parse(body);
        const valid = verifyConsensusProof(payload, proof_id);
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
  console.log(`Consensus Microservice running on http://localhost:${PORT}`);
});