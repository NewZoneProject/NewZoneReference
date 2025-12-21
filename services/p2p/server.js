import http from "http";
import {
  addPeer,
  listPeers,
  mergePeers,
  sendHeartbeat
} from "./index.js";

const PORT = process.env.PORT || 3015;
const SELF_ID = "node-" + Math.random().toString(36).slice(2, 10);
const SELF_URL = process.env.SELF_URL || `http://p2p-service:${PORT}`;

const SELF_INFO = { id: SELF_ID, url: SELF_URL };

// Heartbeat loop
setInterval(async () => {
  const peers = listPeers();
  for (const peer of peers) {
    await sendHeartbeat(peer, SELF_INFO);
  }
}, 3000);

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok", id: SELF_ID }));
  }

  // GET /peers
  if (req.method === "GET" && req.url === "/peers") {
    res.writeHead(200);
    return res.end(JSON.stringify(listPeers()));
  }

  // POST /p2p/announce
  if (req.method === "POST" && req.url === "/p2p/announce") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const { id, url } = JSON.parse(body);
        const peer = addPeer(id, url);

        res.writeHead(200);
        res.end(JSON.stringify(peer));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid announce" }));
      }
    });

    return;
  }

  // POST /p2p/heartbeat
  if (req.method === "POST" && req.url === "/p2p/heartbeat") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const peer = JSON.parse(body);
        addPeer(peer.id, peer.url);

        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid heartbeat" }));
      }
    });

    return;
  }

  // POST /p2p/merge
  if (req.method === "POST" && req.url === "/p2p/merge") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const { peers } = JSON.parse(body);
        mergePeers(peers);

        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid merge" }));
      }
    });

    return;
  }

  // Not found
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`P2P Node Microservice running on http://localhost:${PORT}`);
});