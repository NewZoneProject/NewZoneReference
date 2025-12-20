# Storage Microservice

Minimal content-addressed object store for NewZone reference implementation.

## Features

- Deterministic SHA-256 hashing
- Store objects by hash
- Retrieve objects by hash
- Verify object integrity
- Stateless API, in-memory storage
- No external dependencies

---

## API

### POST /store
Store object and return its hash.

Body:
```
{
  "payload": { ... }
}
```

Response:
```
{
  "hash_id": "<sha256>"
}
```

---

### GET /get/:hash_id
Retrieve stored object.

Response:
```
{
  "payload": { ... }
}
```

---

### POST /verify
Verify object integrity.

Body:
```
{
  "payload": { ... },
  "hash_id": "<sha256>"
}
```

Response:
```
{
  "valid": true
}
```

---

## Run

```bash
node services/storage/server.js
```

Or via Docker:

```bash
docker build -t storage .
docker run -p 3003:3003 storage
```