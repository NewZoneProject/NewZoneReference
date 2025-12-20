# Metadata Microservice

Stateless microservice for generating and verifying metadata integrity proofs.

## Principles
- Based on NewZone specs: NZ-0037 (Metadata Integrity Proofs), NZ-0057 (Metadata Forward Proofs).
- Stateless, deterministic, portable.
- No external dependencies (Vanilla JS + built-in crypto).

---

## Usage (CLI)

```bash
node services/metadata/index.js
```

Output:
```
Generated Proof: <64-char hash>
Verification: true
```

---

## Usage (REST API)

Start server:
```bash
node services/metadata/server.js
```

Generate metadata proof:
```bash
curl -X POST http://localhost:3001/generate \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"doc":"contract","version":1}}'
```

Response:
```json
{ "proof_id": "a1b2c3d4..." }
```

Verify metadata proof:
```bash
curl -X POST http://localhost:3001/verify \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"doc":"contract","version":1},"proof_id":"a1b2c3d4..."}'
```

Response:
```json
{ "valid": true }
```