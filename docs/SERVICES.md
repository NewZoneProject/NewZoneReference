# NewZoneReference — Microservices Overview

This document provides a complete overview of all microservices included in the NewZone Reference Implementation.  
Each service represents a logical role defined by the NewZone architectural model.

All services share the same properties:

- Pure Node.js (no external dependencies)
- Stateless by default
- Deterministic behavior
- Unified REST API pattern
- `/health` endpoint for self‑verification
- Minimal Docker footprint
- Portable across all environments (including mobile)

---

## Identity Service (3000)
Deterministic identity generation and verification.  
Provides stable, reproducible identifiers for nodes, entities, and resources.

---

## Metadata Service (3001)
Structured metadata hashing and integrity proofs.  
Used for validating metadata consistency across systems.

---

## Consensus Service (3002)
Lightweight consensus integrity proofs.  
Not a full consensus engine — provides minimal primitives for distributed validation.

---

## Storage Service (3003)
Content‑addressed object storage.  
Stores immutable objects by hash and returns deterministic identifiers.

---

## Gateway Service (3004)
Unified external API entrypoint.  
Provides direct access to all core services and optional passthrough routing.

---

## Routing Service (3005)
Internal message router for multi‑hop routing and service‑to‑service communication.  
Supports advanced workflows and dynamic routing patterns.

---

## Logging Service (3006)
Minimal event logging and trace recording.  
Provides a simple, dependency‑free logging pipeline.

---

## Monitoring Service (3007)
Lightweight metrics and health aggregation.  
Collects basic runtime information from all services.

---

## Analytics Service (3008)
Basic event aggregation and statistical summaries.  
Provides simple analytical insights without external dependencies.

---

## Directory Service (3009)
Dynamic service registration and discovery.  
Allows services to announce themselves and discover peers within the local cluster.

---

## Scheduler Service (3010)
Periodic task execution.  
Provides time‑based automation for internal workflows.

---

## State Service (3011)
Key‑value state storage with timestamp‑based conflict resolution.  
Implements a minimal, deterministic state model.

---

## Queue Service (3012)
FIFO message queue with bounded memory.  
Provides simple asynchronous message passing.

---

## Rules Service (3013)
Reactive automation engine.  
Executes IF‑THEN rules triggered by events, state changes, or queue messages.

---

## P2P Node Service (3015)
Peer discovery, heartbeat exchange, and network topology awareness.  
Forms the foundation for distributed NewZone networks.

---

## Replication Service (3016)
Push/pull replication of state, events, and rules across peers.  
Provides minimal distributed synchronization.

---

## Event Service (port TBD)
Lightweight event emitter and subscriber.  
Used for internal event propagation and reactive workflows.

---

# Notes

This document reflects the current state of the NewZoneReference repository.  
Future versions may introduce additional roles or refine existing ones as NZCore evolves.