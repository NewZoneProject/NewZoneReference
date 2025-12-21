# Scheduler Microservice

Minimal periodic task scheduler for NewZoneReference.

Provides:
- Stateless task scheduling
- In-memory task list (bounded)
- Periodic POST callbacks
- Pure Node.js, no dependencies

---

## API

### POST /task
{
  "interval_ms": 5000,
  "callback_url": "http://event-service:3008/event",
  "payload": { "type": "heartbeat" }
}

### GET /tasks
List all tasks.

### DELETE /tasks/<id>
Remove task.

### GET /health
Healthcheck.

---

## Run

node services/scheduler/server.js

Docker:
docker build -t scheduler .
docker run -p 3010:3010 scheduler