// Module: Replication Microservice Core
// Description: Minimal data replication layer for NewZoneReference.
// File: index.js

let LOCAL_DATA = {
    state: {},
    events: [],
    rules: []
};

const MAX_EVENTS = 200;

/**
 * Update local data with incoming replicated data
 * @param {object} incoming
 */
function mergeData(incoming) {
    // Merge state
    for (const key in incoming.state) {
        const local = LOCAL_DATA.state[key];
        const remote = incoming.state[key];

        if (!local || remote.ts > local.ts) {
            LOCAL_DATA.state[key] = remote;
        }
    }

    // Merge events (bounded)
    const combinedEvents = [...LOCAL_DATA.events, ...incoming.events];
    combinedEvents.sort((a, b) => a.ts - b.ts);
    LOCAL_DATA.events = combinedEvents.slice(-MAX_EVENTS);

    // Merge rules (latest timestamp wins)
    const ruleMap = {};
    [...LOCAL_DATA.rules, ...incoming.rules].forEach(r => {
        if (!ruleMap[r.id] || r.ts > ruleMap[r.id].ts) {
            ruleMap[r.id] = r;
        }
    });
    LOCAL_DATA.rules = Object.values(ruleMap);
}

/**
 * Export local data for replication
 * @returns {object}
 */
function dumpData() {
    return LOCAL_DATA;
}

/**
 * Update local snapshot from external services
 */
async function refreshLocalSnapshot() {
    try {
        const stateRes = await fetch("http://state-service:3011/keys");
        const keys = await stateRes.json();

        const newState = {};
        for (const key of keys) {
            const res = await fetch(`http://state-service:3011/get/${key}`);
            newState[key] = await res.json();
        }

        LOCAL_DATA.state = newState;
    } catch {}

    try {
        const evRes = await fetch("http://event-service:3008/events?limit=200");
        LOCAL_DATA.events = await evRes.json();
    } catch {}

    try {
        const ruleRes = await fetch("http://rules-service:3014/rules");
        LOCAL_DATA.rules = await ruleRes.json();
    } catch {}
}

/**
 * Push local data to a peer
 * @param {string} peerUrl
 */
async function pushToPeer(peerUrl) {
    try {
        await fetch(peerUrl + "/replicate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(LOCAL_DATA)
        });
    } catch {}
}

/**
 * Pull data from a peer
 * @param {string} peerUrl
 */
async function pullFromPeer(peerUrl) {
    try {
        const res = await fetch(peerUrl + "/dump");
        const incoming = await res.json();
        mergeData(incoming);
    } catch {}
}

module.exports = {
    mergeData,
    dumpData,
    refreshLocalSnapshot,
    pushToPeer,
    pullFromPeer
};