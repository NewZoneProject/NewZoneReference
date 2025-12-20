# Consensus Microservice

Stateless microservice for generating and verifying consensus integrity proofs.

## Principles
- Based on NewZone specs:
  - NZ-0046 (Consensus Integrity Proofs)
  - NZ-0058 (Consensus Forward Proofs)
- Stateless, deterministic, portable.
- No external dependencies (Vanilla JS + built-in crypto).

---

## Usage (CLI)

```bash
node services/consensus/index.js
```

## Output:
```
Generated Consensus Proof: <64-char hash>
Verification: true
```

---

API (planned)
- POST /generate → returns proof_id
- POST /verify → returns boolean

REST API wrapper will follow the same minimalistic pattern as identity and metadata.
`