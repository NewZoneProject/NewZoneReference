// Module: P2P Node Microservice Core
// Description: Minimal peer-to-peer node registry and heartbeat sender for NewZoneReference.
// File: index.js

const PEERS = {};
const MAX_PEERS = 200;

/**
 * Add or update peer
 * @param {string} id
 * @param {string} url
 * @returns {object}
 */
function addPeer(id, url) {
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
 * @returns {Array}
 */
function listPeers() {
    return Object.values(PEERS);
}

/**
 * Merge peer list from another node
 * @param {Array} list
 */
function mergePeers(list) {
    for (const p of list) {
        addPeer(p.id, p.url);
    }
}

/**
 * Send heartbeat to a peer
 * @param {object} peer
 * @param {object} selfInfo
 */
async function sendHeartbeat(peer, selfInfo) {
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

module.exports = {
    addPeer,
    listPeers,
    mergePeers,
    sendHeartbeat
};