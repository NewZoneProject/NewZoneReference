# Monitoring Microservice

Minimal cluster health aggregator for NewZoneReference.

This service provides:
- Aggregated /health for all microservices
- Basic uptime metrics
- Recent events from Logging Microservice
- Pure Node.js, no dependencies

---

## API

### GET /health
Health of Monitoring itself.

### GET /services
Aggregated health of all services.

### GET /metrics
{
  uptime_ms,
  services: { ... },
  recent_events: [ ... ]
}

### GET /status
Human-readable cluster status.

---

## Run

Local:
node services/monitoring/server.js

Docker:
docker build -t monitoring .
docker run -p 3007:3007 monitoring