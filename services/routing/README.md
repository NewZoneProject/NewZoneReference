# Routing Microservice

Internal message router for the NewZoneReference cluster.

This service provides minimal, stateless routing between internal microservices.
It enables dynamic routing, multi-hop flows, and service-to-service communication
without introducing dependencies or shared state.

Routing is optional for external clients: it can be accessed directly or through
Gateway’s `/route` passthrough.

---

## Features

- Stateless message forwarding
- Route resolution based on `"target"`
- Internal hop logging
- Pure Node.js, no dependencies
- Acts as an internal message bus for advanced workflows
- Fully deterministic and portable

---

## API

### POST /route

Request body:
```
{
  "target": "identity | metadata | consensus | storage",
  "path": "/some/endpoint",
  "payload": { ... }
}
```

Response:
```
{
  "hop": "routing-service",
  "target": "...",
  "result": { ... }
}
```

This endpoint forwards the request to the appropriate microservice based on
target, then returns the result along with hop metadata.

---

## Healthcheck

GET /health  
→ { "status": "ok" }

Used by Docker for deterministic startup and service monitoring.

---

## Run

### Local:
```bash
node services/routing/server.js
```

### Docker:
```bash
docker build -t routing .
docker run -p 3005:3005 routing
```

Routing listens on port 3005.