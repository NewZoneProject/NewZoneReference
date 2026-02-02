# NewZone Reference Implementation

This repository contains the official reference implementation of the NewZone Standard.

It provides a minimalistic, stateless, dependency‑free set of microservices that demonstrate how NewZone specifications can be applied in real systems.  
All services are implemented in pure Node.js (no external dependencies), fully portable, deterministic, and designed for long‑term stability.

The goal of this repository is to serve as a clean, canonical example of how NewZone Core concepts can be realized in practice.

---

## Included Services

### Identity Microservice (3000)
Deterministic identity generation and verification.

### Metadata Microservice (3001)
Metadata integrity proofs and structured metadata handling.

### Consensus Microservice (3002)
Lightweight consensus integrity proofs for distributed validation.

### Storage Microservice (3003)
Content‑addressed object storage (hash‑based, immutable).

### Gateway Microservice (3004)
Unified external API entrypoint.  
Provides:
- direct routes to all core services  
- optional /route passthrough to the Routing Microservice

### Routing Microservice (3005)
Internal message router for advanced workflows, multi‑hop routing, and service‑to‑service communication.

### Logging Microservice (3006)
Minimal event logging and trace recording.

### Monitoring Microservice (3007)
Lightweight metrics and health aggregation.

### Analytics Microservice (3008)
Basic event aggregation and statistical summaries.

### Directory Microservice (3009)
Dynamic service registration and discovery.

### Scheduler Microservice (3010)
Periodic task execution and time‑based automation.

### State Microservice (3011)
Key‑value state storage with timestamp‑based conflict resolution.

### Queue Microservice (3012)
FIFO message queue with bounded memory.

### Rules Microservice (3013)
Reactive automation via IF‑THEN rules.

### P2P Node Microservice (3015)
Peer discovery, heartbeat exchange, and network topology awareness.

### Replication Microservice (3016)
Push/pull replication of state, events, and rules across peers.

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

These principles ensure that every service is predictable, transparent, and easy to reason about — essential qualities for a long‑term, civilization‑scale standard.

---

## Repository Structure

```
services/
  analytics/
  consensus/
  directory/
  event/
  gateway/
  identity/
  logging/
  metadata/
  monitoring/
  p2p/
  queue/
  replication/
  routing/
  rules/
  scheduler/
  state/
  storage/
docker-compose.yml
README.md
```

Each service directory contains:

- index.js — core logic  
- server.js — HTTP interface  
- Dockerfile — minimal container definition  
- README.md (optional) — service‑specific documentation  

---

## Running the Cluster

### Start all services:

```bash
docker-compose up --build
```

### Stop the cluster:

```bash
docker-compose down
```

Services will be available at:

- Identity → http://localhost:3000  
- Metadata → http://localhost:3001  
- Consensus → http://localhost:3002  
- Storage → http://localhost:3003  
- Gateway → http://localhost:3004  
- Routing → http://localhost:3005  
- Logging → http://localhost:3006  
- Monitoring → http://localhost:3007  
- Analytics → http://localhost:3008  
- Directory → http://localhost:3009  
- Scheduler → http://localhost:3010  
- State → http://localhost:3011  
- Queue → http://localhost:3012  
- Rules → http://localhost:3013  
- P2P Node → http://localhost:3015  
- Replication → http://localhost:3016

---

## Purpose

This repository is not part of the NewZone Standard itself.  
Instead, it exists to:

- demonstrate how NewZone specifications can be implemented  
- provide a clean, minimal runtime for experimentation  
- serve as a reference for developers building NewZone‑compatible systems  
- offer a foundation for future SDKs, tools, and applications  
- illustrate the architectural principles of NewZone in a practical, portable form  

NewZoneReference is intentionally simple — it is designed to be read, understood, and re‑implemented.

---

## Running the Cluster with PM2 (Android / Termux / Bare Metal)

Docker is not available on Android without root, so the NewZone cluster can also be launched using **PM2**, a lightweight process manager for Node.js.

### 1. Install pm2

```bash
npm install -g pm2
```

### 2. Start all microservices

```bash
pm2 start pm2.config.js
```

This configuration file launches every service on its fixed port (3000–3016).

### 3. Check status

```bash
pm2 ls
```

### 4. View logs

```bash
pm2 logs
```

### 5. Stop the cluster

```bash
pm2 stop all
```

### 6. Restart the cluster

```bash
pm2 restart all
```

PM2 provides a clean, portable alternative to Docker Compose and works perfectly on Android devices via Termux.

---

## License

MIT — free for all use cases.
