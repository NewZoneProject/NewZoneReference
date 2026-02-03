// Module: Directory / Discovery Microservice Core
// Description: Minimal in-memory service registry for NewZoneReference with TTL + heartbeat support.
// File: index.js

const SERVICES = [];
const MAX_SERVICES = 200;

/**
 * Register a service
 * @param {string} role
 * @param {string} url
 * @returns {object}
 */
function registerService(role, url) {
    const id = "svc-" + Math.random().toString(36).slice(2, 10);

    const entry = {
        id,
        role,
        url,
        ts: Date.now(),
        ttl: 10000 // default TTL = 10 seconds
    };

    SERVICES.push(entry);
    if (SERVICES.length > MAX_SERVICES) SERVICES.shift();

    return entry;
}

/**
 * Update heartbeat for a service
 * @param {string} role
 * @param {string} url
 * @param {number} ttl
 */
function updateHeartbeat(role, url, ttl) {
    const svc = SERVICES.find(s => s.role === role && s.url === url);
    if (svc) {
        svc.ts = Date.now();
        svc.ttl = ttl;
        return true;
    }
    return false;
}

/**
 * Remove expired services based on TTL
 */
function cleanupExpired() {
    const now = Date.now();
    for (let i = SERVICES.length - 1; i >= 0; i--) {
        const s = SERVICES[i];
        if (now - s.ts > s.ttl) {
            SERVICES.splice(i, 1);
        }
    }
}

// Run cleanup every 5 seconds
setInterval(cleanupExpired, 5000);

/**
 * List all services as an object keyed by role
 * @returns {object}
 */
function listServices() {
    const out = {};
    for (const s of SERVICES) {
        out[s.role] = {
            id: s.id,
            url: s.url,
            ts: s.ts,
            ttl: s.ttl
        };
    }
    return out;
}

/**
 * Find services by role
 * @param {string} role
 * @returns {Array}
 */
function findByRole(role) {
    return SERVICES.filter(s => s.role === role);
}

/**
 * Remove service by ID
 * @param {string} id
 */
function removeService(id) {
    const idx = SERVICES.findIndex(s => s.id === id);
    if (idx !== -1) SERVICES.splice(idx, 1);
}

module.exports = {
    registerService,
    updateHeartbeat,
    listServices,
    findByRole,
    removeService
};