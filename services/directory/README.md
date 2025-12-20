# Directory / Discovery Microservice

Minimal service registry for NewZoneReference.

Provides:
- Stateless service registration
- In-memory registry (bounded)
- Lookup by role
- Lookup by id
- Pure Node.js, no dependencies

---

## API

### POST /register
{
  "role": "identity",
  "url": "http://identity-service:3000"
}

### GET /services
List all registered services.

### GET /services/<role>
Find services by role.

### DELETE /services/<id>
Remove service.

### GET /health
Healthcheck.

---

## Run

node services/directory/server.js

Docker:
docker build -t directory .
docker run -p 3009:3009 directory