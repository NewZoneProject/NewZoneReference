# NewZoneReference — API Specification

This document provides a unified API reference for all microservices included in the **NewZone Reference Implementation**.  
All services follow the same REST conventions:

- JSON in / JSON out  
- deterministic responses  
- no external dependencies  
- consistent error format  
- /health endpoint for self‑verification  
- stable, predictable behavior  

---

## 1. Identity Microservice (3000)

### Endpoints

```
| Method | Endpoint  | Description                         |
|--------|-----------|-------------------------------------|
|  GET   | /health   | Service health check                |
|  GET   | /info     | Service metadata                    |
|  POST  | /generate | Generate a deterministic identity   |
|  POST  | /verify   | Verify identity integrity           |
```

### Example: Generate Identity

```json
POST /generate
{
  "seed": "optional-string"
}
```

### Response:

```json
{
  "id": "nzid:abc123...",
  "hash": "sha256..."
}
```

---

## 2. Metadata Microservice (3001)

Endpoints

```
| Method | Endpoint  | Description                         |
|--------|-----------|-------------------------------------|
|  GET   | /health   | Service health check                |
|  GET   | /info     | Service metadata                    |
|  POST  | /metadata | Submit metadata for hashing / proof |
|  POST  | /verify   | Verify metadata integrity proof     |
```

Example: Submit Metadata

```json
POST /metadata
{
  "data": {
    "name": "Example",
    "version": "1.0"
  }
}
```

Response:

```json
{
  "hash": "sha256...",
  "proof": "..."
}
```

---

## 3. Consensus Microservice (3002)

Endpoints

```
| Method | Endpoint  | Description                         |
|--------|-----------|-------------------------------------|
|  GET   | /health   | Service health check                |
|  GET   | /info     | Service metadata                    |
|  POST  | /proof    | Generate a consensus integrity proof|
|  POST  | /verify   | Verify a consensus proof            |
```

Example: Generate Proof

```json
POST /proof
{
  "input": "some-value"
}
```

Response:

```json
{
  "proof": "sha256...",
  "valid": true
}
```

---

## 4. Storage Microservice (3003)

Endpoints

```
| Method | Endpoint   | Description                        |
|--------|------------|------------------------------------|
|  GET   | /health    | Service health check               |
|  GET   | /info      | Service metadata                   |
|  POST  | /store     | Store an object                    |
|  GET   | /get/:hash | Retrieve an object by hash         |
|  GET   | /list      | List stored object hashes          |
```

Example: Store Object

```json
POST /store
{
  "object": {
    "hello": "world"
  }
}
```

Response:

```json
{
  "hash": "sha256..."
}
```

---

## 5. Gateway Microservice (3004)

Endpoints

```
| Method | Endpoint     | Description                      |
|--------|--------------|----------------------------------|
|  GET   | /health      | Service health check             |
|  GET   | /info        | Service metadata                 |
|  POST  | /identity/*  | Proxy to Identity service        |
|  POST  | /metadata/*  | Proxy to Metadata service        |
|  POST  | /consensus/* | Proxy to Consensus service       |
|  POST  | /storage/*   | Proxy to Storage service         |
| POST | /route | Optional passthrough to Routing service  |
```

Example: Proxy to Identity

```json
POST /identity/generate
{
  "seed": "abc"
}
```

---

## 6. Routing Microservice (3005)

Endpoints

```
| Method | Endpoint  | Description                         |
|--------|-----------|-------------------------------------|
|  GET   | /health   | Service health check                |
|  GET   | /info     | Service metadata                    |
|  POST  | /route    | Route a message to another service  |
|  POST  | /internal | Internal service‑to‑service routing  |
|  GET   | /routes   | List known routes                   |
```

Example: Route Message

```json
POST /route
{
  "target": "storage",
  "action": "store",
  "payload": { "x": 1 }
}
```

---

## 7. Unified Error Format

All services return errors in a consistent structure:

```json
{
  "error": "string",
  "message": "string"
}
```

---

## 8. Unified Health Format

Every service exposes:

```json
{
  "status": "ok",
  "service": "identity",
  "timestamp": 1234567890
}
```

---

## 9. Notes on Determinism

- All hashing uses built‑in Node.js crypto  
- All timestamps are UNIX epoch (ms)  
- All services avoid randomness unless explicitly requested  
- All responses are stable for identical inputs  

---

## 10. Versioning

This API corresponds to the **NewZoneReference v1.x** runtime.  
Future versions may extend functionality but will preserve backward compatibility where possible.