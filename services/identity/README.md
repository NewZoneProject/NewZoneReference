# Identity Microservice

Stateless microservice for generating and verifying identity IDs.

## Principles
- Based on NewZone specs: NZ-0002 (Identity Format), NZ-0032 (Identity Graph Verification), NZ-0056 (Identity Forward Proofs).
- Stateless, deterministic, portable.
- No external dependencies (Vanilla JS + built-in crypto).

---

## Usage (CLI)

```bash
node services/identity/index.js
```

Output:
```
Generated ID: <32-char identity>
Verification: true
```

---

## Usage (REST API)

Start server:
```bash
node services/identity/server.js
```

Generate ID:
```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"input":"oleg@example"}'
```

Response:
```json
{ "identity_id": "a1b2c3d4..." }
```

Verify ID:
```bash
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{"input":"oleg@example","identity_id":"a1b2c3d4..."}'
```

Response:
```json
{ "valid": true }
```