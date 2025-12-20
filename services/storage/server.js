import http from "http";
import { storeObject, getObject, verifyObject } from "./index.js";

const PORT = process.env.PORT || 3003;

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
  // Enable CORS + JSON headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // POST /store
  if (req.method === "POST" && req.url === "/store") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const { payload } = JSON.parse(body);
        const hash_id = storeObject(payload);

        // Non-blocking logging
        logEvent("storage", "object_stored", { hash_id });

        res.writeHead(200);
        res.end(JSON.stringify({ hash_id }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });

    return;
  }

  // GET /get/<hash>
  if (req.method === "GET" && req.url.startsWith("/get/")) {
    const hash_id = req.url.split("/get/")[1];
    const obj = getObject(hash_id);

    if (obj) {
      res.writeHead(200);
      res.end(JSON.stringify({ payload: obj }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    }

    return;
  }

  // POST /verify
  if (req.method === "POST" && req.url === "/verify") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const { payload, hash_id } = JSON.parse(body);
        const valid = verifyObject(payload, hash_id);

        // Optional logging
        logEvent("storage", "object_verified", { hash_id, valid });

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

server.listen(PORT, () => {
  console.log(`Storage Microservice running on http://localhost:${PORT}`);
});