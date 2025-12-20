# NewZone Reference Implementation

This repository contains the official reference implementation of the NewZone Standard.

It provides a minimalistic, stateless, dependency-free set of microservices that demonstrate how NewZone specifications can be applied in real systems.

## Included Services

- Identity Microservice  
  Deterministic identity generation and verification.

- Metadata Microservice  
  Metadata integrity proofs.

- Consensus Microservice  
  Consensus integrity proofs.

Each service follows the same principles:
- Stateless
- Deterministic
- Portable
- No external dependencies (Vanilla JS + built-in crypto)
- Unified REST API pattern
- Minimal Docker architecture

---

## Repository Structure

```
services/
  identity/
  metadata/
  consensus/
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

---

## Purpose

This repository is not part of the NewZone Standard itself.  
It exists to:

- demonstrate how the specifications can be implemented  
- provide a clean, minimal runtime  
- serve as a reference for developers building NewZone-compatible systems  
- offer a foundation for future SDKs, tools, and applications  

---

## License

MIT — free for all use cases.
