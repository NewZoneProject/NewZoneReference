# Logging Microservice

Minimal in-memory log collector for the NewZoneReference cluster.

This service provides:
- Stateless log ingestion
- Bounded in-memory storage
- Internal event tracing
- Pure Node.js, no dependencies
- Optional integration with any microservice

---

## API

### POST /log
Add a log entry.

Body:
{
  "source": "gateway | routing | identity | ...",
  "event": "string",
  "payload": { ... }
}

### GET /events?limit=100
Return recent log entries.

---

## Healthcheck

GET /health  
→ { "status": "ok" }

---

## Run

Local:
node services/logging/server.js

Docker:
docker build -t logging .
docker run -p 3006:3006 logging