# Rules / Policy Microservice

Minimal rule engine for NewZoneReference.

Provides:
- IF → THEN rules
- Event triggers
- Queue triggers
- State updates
- Callback execution
- Pure Node.js, no dependencies

---

## API

### POST /rule
{
  "condition": { "key": "type", "value": "identity.created" },
  "action": {
    "type": "queue",
    "queue": "tasks",
    "payload": { "task": "process_identity" }
  }
}

### GET /rules
List rules.

### DELETE /rules/<id>
Remove rule.

### POST /evaluate
Evaluate all rules against a context.

### GET /health
Healthcheck.