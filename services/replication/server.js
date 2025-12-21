import http from "http";
import {
  mergeData,
  dumpData,
  refreshLocalSnapshot,
  pushToPeer,
  pullFromPeer
} from "./index.js";

const PORT = process.env.PORT || 3016;

// Periodic sync loop
setInterval(async () => {
  try {
    const res = await fetch("http://p2p-service:3015/peers");
    const peers = await res.json();

    for (const peer of peers) {
      await pullFromPeer(peer.url);
      await pushToPeer(peer.url);
    }
  } catch {}
}, 5000);

// Periodic local snapshot refresh
setInterval(refreshLocalSnapshot, 4000);

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // POST /replicate — incoming data
  if (req.method === "POST" && req.url === "/replicate") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const incoming = JSON.parse(body);
        mergeData(incoming);

        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid replication" }));
      }
    });

    return;
  }

  // GET /dump — export local data
  if (req.method === "GET" && req.url === "/dump") {
    res.writeHead(200);
    return res.end(JSON.stringify(dumpData()));
  }

  // Not found
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Replication Microservice running on http://localhost:${PORT}`);
});