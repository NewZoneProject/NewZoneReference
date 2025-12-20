# Gateway Microservice

Unified external entrypoint for the NewZoneReference microservice cluster.

Gateway provides:
- direct proxy routes to Identity, Metadata, Consensus, and Storage microservices
- an optional `/route` passthrough to the Routing Microservice
- a minimal, stateless, dependency‑free REST interface

This service does not contain business logic.  
It simply forwards requests to the appropriate internal microservice.

---

## Direct Routes (recommended)

### /identity/*
→ forwarded to identity-service:3000

### /metadata/*
→ forwarded to metadata-service:3001

### /consensus/*
→ forwarded to consensus-service:3002

### /storage/*
→ forwarded to storage-service:3003

These routes provide the cleanest and most predictable API surface.

---

## Optional Routing Passthrough

### POST /route
For advanced workflows, Gateway can forward routing requests to:

→ routing-service:3005

Example body:
{
  "target": "consensus",
  "path": "/generate",
  "payload": { ... }
}

This enables dynamic routing, multi-hop flows, and internal message pipelines.

---

## Examples

POST /identity/generate  
POST /metadata/verify  
POST /consensus/generate  
GET  /storage/get/<hash>

Optional:
POST /route  
{
  "target": "metadata",
  "path": "/verify",
  "payload": { ... }
}

---

## Healthcheck

GET /health  
→ { "status": "ok" }

Used by Docker for deterministic startup.

---

## Run

### Local

```bash
node services/gateway/server.js
```

### Docker

```bash
docker build -t gateway .
docker run -p 3004:3004 gateway
```

Gateway listens on port 3004.