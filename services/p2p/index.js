/**
 * P2P Node Microservice
 * Minimal peer-to-peer node for NewZoneReference
 * Pure Node.js, no dependencies
 */

const PEERS = {};
const MAX_PEERS = 200;

/**
 * Add or update peer
 */
export function addPeer(id, url) {
  PEERS[id] = {
    id,
    url,
    ts: Date.now()
  };

  // bounded memory
  const keys = Object.keys(PEERS);
  if (keys.length > MAX_PEERS) {
    const oldest = keys.sort((a, b) => PEERS[a].ts - PEERS[b].ts)[0];
    delete PEERS[oldest];
  }

  return PEERS[id];
}

/**
 * List peers
 */
export function listPeers() {
  return Object.values(PEERS);
}

/**
 * Merge peer list from another node
 */
export function mergePeers(list) {
  for (const p of list) {
    addPeer(p.id, p.url);
  }
}

/**
 * Send heartbeat to a peer
 */
export async function sendHeartbeat(peer, selfInfo) {
  try {
    await fetch(peer.url + "/p2p/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selfInfo)
    });
  } catch {
    // ignore errors
  }
}