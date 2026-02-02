// Module: Queue Microservice Core
// Description: Minimal FIFO queue system for NewZoneReference.
// File: index.js

const QUEUES = {};
const MAX_QUEUE_SIZE = 500;

/**
 * Ensure queue exists
 * @param {string} name
 */
function ensureQueue(name) {
    if (!QUEUES[name]) QUEUES[name] = [];
}

/**
 * Enqueue item
 * @param {string} queue
 * @param {any} payload
 * @returns {object}
 */
function enqueue(queue, payload) {
    ensureQueue(queue);

    const item = {
        ts: Date.now(),
        payload
    };

    QUEUES[queue].push(item);

    // bounded memory
    if (QUEUES[queue].length > MAX_QUEUE_SIZE) {
        QUEUES[queue].shift();
    }

    return item;
}

/**
 * Dequeue item
 * @param {string} queue
 * @returns {object|null}
 */
function dequeue(queue) {
    ensureQueue(queue);

    if (QUEUES[queue].length === 0) return null;

    return QUEUES[queue].shift();
}

/**
 * Peek queue
 * @param {string} queue
 * @param {number} limit
 * @returns {Array}
 */
function peek(queue, limit = 10) {
    ensureQueue(queue);
    return QUEUES[queue].slice(0, limit);
}

/**
 * List queues
 * @returns {Array}
 */
function listQueues() {
    return Object.keys(QUEUES).map(name => ({
        name,
        size: QUEUES[name].length
    }));
}

module.exports = {
    enqueue,
    dequeue,
    peek,
    listQueues
};