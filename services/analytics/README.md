# Analytics Microservice

Minimal analytics and aggregation layer for NewZoneReference.

Uses:
- Logging Microservice (/events)
- Event Microservice (/events)

Provides:
- Aggregated metrics by source and type
- Compact cluster activity summary
- Pure Node.js, no dependencies

---

## API

### GET /health
Healthcheck.

### POST /recompute
Recompute metrics from Logging + Event.

Response:
{
  "total_events": 123,
  "events_by_source": { "identity": 10, ... },
  "events_by_type": { "identity_generated": 10, ... },
  "last_updated": 1734720000000
}

### GET /metrics
Get last computed metrics (no recompute).

### GET /summary
Short form:
{
  "total_events": ...,
  "sources": { ... },
  "types": { ... },
  "last_updated": ...
}

---

## Run

node services/analytics/server.js

Docker:
docker build -t analytics .
docker run -p 3012:3012 analytics