# Queue Microservice

Minimal FIFO queue system for NewZoneReference.

Provides:
- Named queues
- FIFO enqueue/dequeue
- Peek
- Bounded memory
- Pure Node.js, no dependencies

---

## API

### POST /enqueue
{
  "queue": "tasks",
  "payload": { ... }
}

### POST /dequeue
{
  "queue": "tasks"
}

### GET /peek?queue=tasks&limit=10

### GET /queues
List all queues and sizes.

### GET /health
Healthcheck.

---

## Run

node services/queue/server.js

Docker:
docker build -t queue .
docker run -p 3013:3013 queue