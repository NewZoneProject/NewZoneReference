/**
 * Storage Microservice REST API
 * Minimal content-addressed object store
 * Pure Node.js http server, no dependencies
 */

import http from "http";
import { storeObject, getObject, verifyObject } from "./index.js";

const PORT = process.env.PORT || 3003;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  if (req.method === "POST" && req.url === "/store") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        const { payload } = JSON.parse(body);
        const hash_id = storeObject(payload);
        res.writeHead(200);
        res.end(JSON.stringify({ hash_id }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });

  } else if (req.method === "GET" && req.url.startsWith("/get/")) {
    const hash_id = req.url.split("/get/")[1];
    const obj = getObject(hash_id);
    if (obj) {
      res.writeHead(200);
      res.end(JSON.stringify({ payload: obj }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    }

  } else if (req.method === "POST" && req.url === "/verify") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        const { payload, hash_id } = JSON.parse(body);
        const valid = verifyObject(payload, hash_id);
        res.writeHead(200);
        res.end(JSON.stringify({ valid }));
      } catch {
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
  console.log(`Storage Microservice running on http://localhost:${PORT}`);
});