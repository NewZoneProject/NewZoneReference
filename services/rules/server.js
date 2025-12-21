import http from "http";
import {
  addRule,
  listRules,
  removeRule,
  evaluateRules
} from "./index.js";

const PORT = process.env.PORT || 3014;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // POST /rule
  if (req.method === "POST" && req.url === "/rule") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const { condition, action } = JSON.parse(body);
        const rule = addRule(condition, action);

        res.writeHead(200);
        res.end(JSON.stringify(rule));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid rule" }));
      }
    });

    return;
  }

  // GET /rules
  if (req.method === "GET" && req.url === "/rules") {
    res.writeHead(200);
    return res.end(JSON.stringify(listRules()));
  }

  // DELETE /rules/<id>
  if (req.method === "DELETE" && req.url.startsWith("/rules/")) {
    const id = req.url.split("/rules/")[1];
    removeRule(id);

    res.writeHead(200);
    return res.end(JSON.stringify({ removed: id }));
  }

  // POST /evaluate
  if (req.method === "POST" && req.url === "/evaluate") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", async () => {
      try {
        const context = JSON.parse(body);
        await evaluateRules(context);

        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid context" }));
      }
    });

    return;
  }

  // Not found
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Rules Microservice running on http://localhost:${PORT}`);
});