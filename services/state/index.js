// Module: State Microservice Core
// Description: Minimal key-value state store for NewZoneReference.
// File: index.js

const STATE = {};
const MAX_KEYS = 500;

/**
 * Set state value
 * @param {string} key
 * @param {any} value
 * @returns {object}
 */
function setState(key, value) {
    if (Object.keys(STATE).length >= MAX_KEYS && !STATE[key]) {
        // remove oldest key
        const oldest = Object.keys(STATE).sort(
            (a, b) => STATE[a].ts - STATE[b].ts
        )[0];
        delete STATE[oldest];
    }

    STATE[key] = {
        value,
        ts: Date.now()
    };

    return STATE[key];
}

/**
 * Get state value
 * @param {string} key
 * @returns {object|null}
 */
function getState(key) {
    return STATE[key] || null;
}

/**
 * Delete state value
 * @param {string} key
 */
function deleteState(key) {
    delete STATE[key];
}

/**
 * List keys
 * @returns {Array<string>}
 */
function listKeys() {
    return Object.keys(STATE);
}

module.exports = {
    setState,
    getState,
    deleteState,
    listKeys
};