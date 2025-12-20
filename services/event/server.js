import http from "http";
import {
  publishEvent,
  getEvents,
  addSubscription,
  removeSubscription,
  listSubscriptions
} from "./index.js";

const PORT = process.env.PORT || 3008;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // POST /event
  if (req.method === "POST" && req.url === "/event") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const { type, source, payload } = JSON.parse(body);
        const event = publishEvent(type, source, payload);

        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, event }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid event" }));
      }
    });

    return;
  }

  // GET /events
  if (req.method === "GET" && req.url.startsWith("/events")) {
    const url = new URL(req.url, "http://localhost");
    const type = url.searchParams.get("type");
    const limit = Number(url.searchParams.get("limit") || 50);

    const events = getEvents(type, limit);

    res.writeHead(200);
    return res.end(JSON.stringify(events));
  }

  // POST /subscribe
  if (req.method === "POST" && req.url === "/subscribe") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const { type, callback } = JSON.parse(body);
        const id = addSubscription(type, callback);

        res.writeHead(200);
        res.end(JSON.stringify({ subscription_id: id }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid subscription" }));
      }
    });

    return;
  }

  // GET /subscriptions
  if (req.method === "GET" && req.url === "/subscriptions") {
    res.writeHead(200);
    return res.end(JSON.stringify(listSubscriptions()));
  }

  // DELETE /subscriptions/<id>
  if (req.method === "DELETE" && req.url.startsWith("/subscriptions/")) {
    const id = req.url.split("/subscriptions/")[1];
    removeSubscription(id);

    res.writeHead(200);
    return res.end(JSON.stringify({ removed: id }));
  }

  // Not found
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Event Microservice running on http://localhost:${PORT}`);
});