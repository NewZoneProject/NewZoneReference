# Routing Microservice

Minimal message router for NewZoneReference.

## Features

- Stateless message forwarding
- Route resolution based on "target"
- Internal hop logging
- Pure Node.js, no dependencies
- Works as internal message bus

---

## API

### POST /route

Body:
```
{
  "target": "identity|metadata|consensus|storage",
  "path": "/some/endpoint",
  "payload": { ... }
}
```

Response:
```
{
  "hop": "routing-service",
  "target": "...",
  "result": { ... }
}
```

---

## Healthcheck

`GET /health → { "status": "ok" }`

---

## Run

```bash
node services/routing/server.js
```