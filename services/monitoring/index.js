// Module: Monitoring Microservice Core
// Description: Minimal cluster health aggregator and log fetcher for NewZoneReference.
// File: index.js

const SERVICES = [
    { name: "identity",  url: "http://identity-service:3000/health" },
    { name: "metadata",  url: "http://metadata-service:3001/health" },
    { name: "consensus", url: "http://consensus-service:3002/health" },
    { name: "storage",   url: "http://storage-service:3003/health" },
    { name: "gateway",   url: "http://gateway-service:3004/health" },
    { name: "routing",   url: "http://routing-service:3005/health" },
    { name: "logging",   url: "http://logging-service:3006/health" }
];

/**
 * Check health of all core services
 * @returns {object}
 */
async function checkServices() {
    const results = {};

    for (const svc of SERVICES) {
        try {
            const res = await fetch(svc.url);
            const json = await res.json();
            results[svc.name] = { ok: true, details: json };
        } catch {
            results[svc.name] = { ok: false };
        }
    }

    return results;
}

/**
 * Fetch recent events from logging service
 * @param {number} limit
 * @returns {Array}
 */
async function getRecentEvents(limit = 50) {
    try {
        const res = await fetch(`http://logging-service:3006/events?limit=${limit}`);
        return await res.json();
    } catch {
        return [];
    }
}

module.exports = {
    checkServices,
    getRecentEvents
};