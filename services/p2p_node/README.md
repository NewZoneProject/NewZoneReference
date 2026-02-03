# P2P Node Microservice

Minimal peer-to-peer node for NewZoneReference.

Provides:
- Peer registration
- Heartbeat
- Peer list merging
- In-memory peer table
- Pure Node.js, no dependencies

---

## API

### GET /peers
List known peers.

### POST /p2p/announce
{
  "id": "node-abc",
  "url": "http://node-abc:3015"
}

### POST /p2p/heartbeat
{
  "id": "...",
  "url": "..."
}

### POST /p2p/merge
{
  "peers": [ ... ]
}

### GET /health
Healthcheck.