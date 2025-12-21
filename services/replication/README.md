# Replication Microservice

Minimal data replication layer for NewZoneReference.

Replicates:
- State
- Events
- Rules

Provides:
- Push replication
- Pull replication
- Peer-based sync
- Bounded memory
- Pure Node.js, no dependencies

---

## API

### POST /replicate
Incoming replicated data.

### GET /dump
Export local data.

### GET /health
Healthcheck.

---

## Internal loops

- Every 4s: refresh local snapshot
- Every 5s: pull + push to all peers