import http from "http";
import {
  addTask,
  listTasks,
  removeTask,
  startScheduler
} from "./index.js";

const PORT = process.env.PORT || 3010;

// Start scheduler loop
startScheduler();

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // Healthcheck
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // POST /task
  if (req.method === "POST" && req.url === "/task") {
    let body = "";
    req.on("data", chunk => (body += chunk));

    req.on("end", () => {
      try {
        const { interval_ms, callback_url, payload } = JSON.parse(body);
        const task = addTask(interval_ms, callback_url, payload);

        res.writeHead(200);
        res.end(JSON.stringify(task));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid task" }));
      }
    });

    return;
  }

  // GET /tasks
  if (req.method === "GET" && req.url === "/tasks") {
    res.writeHead(200);
    return res.end(JSON.stringify(listTasks()));
  }

  // DELETE /tasks/<id>
  if (req.method === "DELETE" && req.url.startsWith("/tasks/")) {
    const id = req.url.split("/tasks/")[1];
    removeTask(id);

    res.writeHead(200);
    return res.end(JSON.stringify({ removed: id }));
  }

  // Not found
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Scheduler Microservice running on http://localhost:${PORT}`);
});