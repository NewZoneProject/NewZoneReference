/**
 * Identity Microservice REST API
 * Stateless ID generation & verification
 * Pure Node.js http server, no dependencies
 */

import http from "http";
import { generateIdentity, verifyIdentity } from "./index.js";

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
        const { input } = JSON.parse(body);
        const id = generateIdentity(input);
        res.writeHead(200);
        res.end(JSON.stringify({ identity_id: id }));
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
        const { input, identity_id } = JSON.parse(body);
        const valid = verifyIdentity(input, identity_id);
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
  console.log(`Identity Microservice running on http://localhost:${PORT}`);
});