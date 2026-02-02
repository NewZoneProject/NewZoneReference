// Module: Event Microservice Core
// Description: Minimal in-memory event bus with subscriptions for NewZoneReference.
// File: index.js

const EVENTS = [];
const SUBSCRIPTIONS = [];
const MAX_EVENTS = 500;

/**
 * Publish event
 * @param {string} type
 * @param {string} source
 * @param {any} payload
 * @returns {object}
 */
function publishEvent(type, source, payload = null) {
    const event = {
        ts: Date.now(),
        type,
        source,
        payload
    };

    EVENTS.push(event);
    if (EVENTS.length > MAX_EVENTS) EVENTS.shift();

    // Notify subscribers (non-blocking)
    for (const sub of SUBSCRIPTIONS) {
        if (sub.type === type) {
            try {
                fetch(sub.callback, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(event)
                });
            } catch {
                // ignore errors
            }
        }
    }

    return event;
}

/**
 * Get events by type
 * @param {string|null} type
 * @param {number} limit
 * @returns {Array}
 */
function getEvents(type = null, limit = 50) {
    const filtered = type
        ? EVENTS.filter(e => e.type === type)
        : EVENTS;

    return filtered.slice(-limit);
}

/**
 * Add subscription
 * @param {string} type
 * @param {string} callback
 * @returns {string} subscription_id
 */
function addSubscription(type, callback) {
    const id = "sub-" + Math.random().toString(36).slice(2, 10);
    SUBSCRIPTIONS.push({ id, type, callback });
    return id;
}

/**
 * Remove subscription
 * @param {string} id
 */
function removeSubscription(id) {
    const idx = SUBSCRIPTIONS.findIndex(s => s.id === id);
    if (idx !== -1) SUBSCRIPTIONS.splice(idx, 1);
}

/**
 * List subscriptions
 * @returns {Array}
 */
function listSubscriptions() {
    return SUBSCRIPTIONS;
}

module.exports = {
    publishEvent,
    getEvents,
    addSubscription,
    removeSubscription,
    listSubscriptions
};