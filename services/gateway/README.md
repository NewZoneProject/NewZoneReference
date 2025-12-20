# Gateway Microservice

Unified entrypoint for the NewZoneReference microservice cluster.

This service provides a minimal, stateless proxy router that forwards requests
to Identity, Metadata, Consensus, and Storage microservices.

---

## Routes

### /identity/*
→ forwarded to identity-service:3000

### /metadata/*
→ forwarded to metadata-service:3001

### /consensus/*
→ forwarded to consensus-service:3002

### /storage/*
→ forwarded to storage-service:3003

---

## Example

POST /identity/generate  
POST /metadata/verify  
POST /consensus/generate  
GET  /storage/get/<hash>

---

## Run

```bash
node services/gateway/server.js
```

Or via Docker:

```bash
docker build -t gateway .
docker run -p 3004:3004 gateway
```