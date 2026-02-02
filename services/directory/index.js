// Module: Directory / Discovery Microservice Core
// Description: Minimal in-memory service registry for NewZoneReference.
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
        ts: Date.now()
    };

    SERVICES.push(entry);
    if (SERVICES.length > MAX_SERVICES) SERVICES.shift();

    return entry;
}

/**
 * List all services
 * @returns {Array}
 */
function listServices() {
    return SERVICES;
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
    listServices,
    findByRole,
    removeService
};