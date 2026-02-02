// Module: Logging Microservice Core
// Description: Minimal in-memory log collector for NewZoneReference.
// File: index.js

const logs = [];
const MAX_LOGS = 500; // bounded memory, stateless philosophy

/**
 * Add a log entry
 * @param {string} source
 * @param {string} event
 * @param {object|null} payload
 * @returns {object}
 */
function addLog(source, event, payload = null) {
    const entry = {
        ts: Date.now(),
        source,
        event,
        payload
    };

    logs.push(entry);

    // keep memory bounded
    if (logs.length > MAX_LOGS) {
        logs.shift();
    }

    return entry;
}

/**
 * Get recent logs
 * @param {number} limit
 * @returns {Array}
 */
function getLogs(limit = 100) {
    return logs.slice(-limit);
}

module.exports = {
    addLog,
    getLogs
};