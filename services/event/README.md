# Event Microservice

Minimal event bus for NewZoneReference.

Provides:
- Stateless event publishing
- In-memory event storage (bounded)
- Subscriptions with callback POST
- Pure Node.js, no dependencies

---

## API

### POST /event
Publish event:
{
  "type": "identity.created",
  "source": "identity",
  "payload": { ... }
}

### GET /events?type=...&limit=50
Get recent events.

### POST /subscribe
{
  "type": "identity.created",
  "callback": "http://routing-service:3005/hook"
}

### GET /subscriptions
List all subscriptions.

### DELETE /subscriptions/<id>
Remove subscription.

### GET /health
Healthcheck.

---

## Run

node services/event/server.js

Docker:
docker build -t event .
docker run -p 3008:3008 event