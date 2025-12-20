# NewZone Architecture (Variant C)

NewZoneReference implements a minimal, deterministic microservice cluster.
The system uses two routing layers:

1. Direct routing (Gateway → Services)
2. Optional internal routing (Gateway → Routing → Services)

This hybrid model preserves minimalism while enabling advanced scenarios.

---

## Services

### Identity (3000)
Deterministic identity proofs.

### Metadata (3001)
Metadata integrity verification.

### Consensus (3002)
Consensus proof generation.

### Storage (3003)
Content‑addressed object storage.

### Gateway (3004)
Unified external API.
Provides:
- Direct routes to all services
- Optional `/route` passthrough to Routing

### Routing (3005)
Internal message router.
Used for:
- service‑to‑service communication
- multi‑hop routing
- advanced workflows

---

## Routing Model (Variant C)

### Direct API (default)
Gateway forwards requests directly to services:

/identity/*  
/metadata/*  
/consensus/*  
/storage/*

### Optional Routing API
Gateway exposes `/route`:

POST /route  
{
  "target": "identity|metadata|consensus|storage",
  "path": "/some/endpoint",
  "payload": { ... }
}

This allows:
- dynamic routing
- pipelines
- multi‑hop flows
- future distributed scenarios

---

## Startup Order

identity → metadata → consensus → storage → routing → gateway

Enforced via:
- healthchecks
- depends_on: condition: service_healthy
- restart: always

---

## Healthchecks

All services expose:

GET /health → { "status": "ok" }

Used by Docker to ensure deterministic startup.