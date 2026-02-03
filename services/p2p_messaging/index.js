// Module: P2P Messaging Microservice Core
// Description: Minimal in-memory message store for NewZoneReference.
// File: index.js

const MESSAGES = [];
const MAX_MESSAGES = 500;

/**
 * Store a message
 * @param {string} to
 * @param {string} message
 * @returns {object}
 */
function storeMessage(to, message) {
    const entry = {
        to,
        message,
        ts: Date.now()
    };

    MESSAGES.push(entry);

    if (MESSAGES.length > MAX_MESSAGES) {
        MESSAGES.shift();
    }

    return entry;
}

/**
 * List all messages
 * @returns {Array}
 */
function listMessages() {
    return MESSAGES;
}

module.exports = {
    storeMessage,
    listMessages
};