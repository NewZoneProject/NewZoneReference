import http from "http";
import { generateMetadataProof, verifyMetadataProof } from "./index.js";

const PORT = process.env.PORT || 3001;

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

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  if (req.method === "POST" && req.url === "/generate") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        const { metadata } = JSON.parse(body);
        const proof = generateMetadataProof(metadata);

        // Логируем успешную генерацию proof
        logEvent("metadata", "metadata_proof_generated", { proof_id: proof });

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

        // Логируем результат проверки
        logEvent("metadata", "metadata_verified", { proof_id, valid });

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