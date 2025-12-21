# State Microservice

Minimal key-value state store for NewZoneReference.

Provides:
- Stateless API for setting and retrieving state
- In-memory bounded storage
- Pure Node.js, no dependencies

---

## API

### POST /set
{
  "key": "node_status",
  "value": { "alive": true }
}

### GET /get/<key>
Retrieve state.

### DELETE /delete/<key>
Remove state.

### GET /keys
List all keys.

### GET /health
Healthcheck.

---

## Run

node services/state/server.js

Docker:
docker build -t state .
docker run -p 3011:3011 state