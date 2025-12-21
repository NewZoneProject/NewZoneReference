import http from "http";
import {
  setState,
  getState,
  deleteState,
  listKeys
} from "./index.js";

const PORT = process.env.PORT || 3011;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // POST /set
  if (req.method === "POST" && req.url === "/set") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const { key, value } = JSON.parse(body);
        const result = setState(key, value);

        res.writeHead(200);
        res.end(JSON.stringify({ key, ...result }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid state" }));
      }
    });

    return;
  }

  // GET /get/<key>
  if (req.method === "GET" && req.url.startsWith("/get/")) {
    const key = req.url.split("/get/")[1];
    const result = getState(key);

    if (result) {
      res.writeHead(200);
      return res.end(JSON.stringify(result));
    }

    res.writeHead(404);
    return res.end(JSON.stringify({ error: "Not found" }));
  }

  // DELETE /delete/<key>
  if (req.method === "DELETE" && req.url.startsWith("/delete/")) {
    const key = req.url.split("/delete/")[1];
    deleteState(key);

    res.writeHead(200);
    return res.end(JSON.stringify({ removed: key }));
  }

  // GET /keys
  if (req.method === "GET" && req.url === "/keys") {
    res.writeHead(200);
    return res.end(JSON.stringify(listKeys()));
  }

  // Not found
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`State Microservice running on http://localhost:${PORT}`);
});