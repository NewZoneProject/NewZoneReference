# NewZone Reference Implementation

This repository contains the official reference implementation of the NewZone Standard.

It provides a minimalistic, stateless, dependency‑free set of microservices that demonstrate how NewZone specifications can be applied in real systems.  
All services are pure Node.js (no external dependencies), portable, deterministic, and designed for long‑term stability.

---

## Included Services

### Identity Microservice (3000)
Deterministic identity generation and verification.

### Metadata Microservice (3001)
Metadata integrity proofs.

### Consensus Microservice (3002)
Consensus integrity proofs.

### Storage Microservice (3003)
Content‑addressed object storage.

### Gateway Microservice (3004)
Unified external API.  
Provides:
- direct routes to all core services  
- optional /route passthrough to Routing Microservice  

### Routing Microservice (3005)
Internal message router for advanced workflows, multi‑hop routing, and service‑to‑service communication.

---

## Core Principles

All microservices follow the same architectural rules:

- Stateless  
- Deterministic  
- Portable  
- Dependency‑free (Vanilla JS + built‑in crypto)  
- Unified REST API pattern  
- Symmetric port layout  
- /health endpoint for self‑verification  
- restart: always for auto‑recovery  
- Deterministic startup order via dependson: condition: servicehealthy  
- Minimal Docker architecture  

---

## Repository Structure

```
services/
  identity/
  metadata/
  consensus/
  storage/
  gateway/
  routing/
docker-compose.yml
```

---

## Running the Cluster

Start all services:

```bash
docker-compose up --build
```

Stop:

```bash
docker-compose down
```

Services run on:

- Identity → http://localhost:3000  
- Metadata → http://localhost:3001  
- Consensus → http://localhost:3002  
- Storage → http://localhost:3003  
- Gateway → http://localhost:3004  
- Routing → http://localhost:3005  

---

## Purpose

This repository is not part of the NewZone Standard itself.  
It exists to:

- demonstrate how the specifications can be implemented  
- provide a clean, minimal runtime  
- serve as a reference for developers building NewZone‑compatible systems  
- offer a foundation for future SDKs, tools, and applications  
- illustrate the architectural principles of NewZone in a practical, portable form  

---

## License

MIT — free for all use cases.
