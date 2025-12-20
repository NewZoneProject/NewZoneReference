# NewZone API (Variant C)

This document describes the external API exposed by Gateway.

---

# 1. Direct API (recommended)

## Identity
POST /identity/generate  
POST /identity/verify

## Metadata
POST /metadata/verify

## Consensus
POST /consensus/generate

## Storage
POST /storage/store  
GET  /storage/get/<hash>

---

# 2. Optional Routing API

POST /route  
{
  "target": "identity|metadata|consensus|storage",
  "path": "/endpoint",
  "payload": { ... }
}

Response:
{
  "hop": "routing-service",
  "target": "...",
  "result": { ... }
}

---

# 3. Healthcheck

GET /health → { "status": "ok" }