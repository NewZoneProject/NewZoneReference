/**
 * Gateway Microservice REST API
 * Unified entrypoint for NewZoneReference
 * Direct proxy routes + optional routing passthrough + crypto verification
 */

import http from "http";
import fs from "fs";
import path from "path";
import { proxyRequest } from "./index.js";
import cryptoLayer from "../../lib/nz-crypto-adapter-noble.js";
import {
  decryptPacket,
  verifySignedPacket
} from "../../lib/nz-crypto.js";

const PORT = process.env.PORT || 3004;

// Load node keys
const node = JSON.parse(fs.readFileSync("./keys/node.json", "utf8"));

// Known nodes (TODO: replace with identity service)
const knownNodes = {};

// Temporary session key (zeroed)
const sessionKey = new Uint8Array(32);

// Resolve public key by node_id
async function getPublicKeyByNodeId(nodeId) {
  const entry = knownNodes[nodeId];
  if (!entry || !entry.ed25519_public) return null;
  return Buffer.from(entry.ed25519_public, "base64");
}

// Direct routes
const ROUTES = {
  "/identity":  { host: "identity-service",  port: 3000 },
  "/metadata":  { host: "metadata-service",  port: 3001 },
  "/consensus": { host: "consensus-service", port: 3002 },
  "/storage":   { host: "storage-service",   port: 3003 }
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // Crypto verification route
  if (req.method === "POST" && req.url === "/verify") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      try {
        const packet = JSON.parse(body);

        const signed = packet.version === "nz-crypto-01"
          ? await decryptPacket({ packet, sessionKey })
          : packet;

        const result = await verifySignedPacket({
          packet: signed,
          getPublicKeyByNodeId,
          isNonceSeen: null,
          maxSkewSec: 300
        });

        if (!result.ok) {
          res.writeHead(403);
          return res.end(JSON.stringify({ error: result.reason }));
        }

        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, node_id: result.node_id }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid crypto packet" }));
      }
    });
    return;
  }

  // Optional routing passthrough
  if (req.method === "POST" && req.url === "/route") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body);
        const result = await proxyRequest(
          "routing-service",
          3005,
          "/route",
          "POST",
          parsed
        );
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
    return;
  }

  // Direct proxy routes
  const prefix = Object.keys(ROUTES).find(p => req.url.startsWith(p));
  if (!prefix) {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: "Unknown route" }));
  }

  const { host, port } = ROUTES[prefix];
  const path = req.url.replace(prefix, "");

  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", async () => {
    let parsed = null;
    if (body) {
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    }

    try {
      const result = await proxyRequest(host, port, path, req.method, parsed);
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Gateway error" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Gateway running on http://localhost:${PORT}`);
});