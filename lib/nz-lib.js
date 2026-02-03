// Module: NewZone Shared Library
// Description: Common helper utilities for all NewZone microservices.
// File: nz-lib.js

/**
 * Auto-register a microservice in the Directory service.
 * Retries until Directory becomes available.
 *
 * @param {string} role - Service role (identity, routing, consensus, etc.)
 * @param {number} port - Local port of the microservice
 */
function autoRegister(role, port) {
    function attempt() {
        fetch("http://localhost:3009/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                role,
                url: `http://localhost:${port}`,
                ts: Date.now()
            })
        })
        .then(() => console.log(`${role} registered in directory`))
        .catch(() => {
            console.log(`${role}: directory not ready, retrying...`);
            setTimeout(attempt, 2000);
        });
    }

    attempt();
}

/**
 * Start periodic heartbeat to Directory.
 *
 * @param {string} role - Service role
 * @param {number} port - Local port
 * @param {number} ttlMs - TTL in milliseconds (e.g., 10000)
 */
function startHeartbeat(role, port, ttlMs = 10000) {
    function beat() {
        fetch("http://localhost:3009/heartbeat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                role,
                url: `http://localhost:${port}`,
                ts: Date.now(),
                ttl: ttlMs
            })
        })
        .catch(() => {
            // Heartbeat failures are normal if Directory is restarting
        });
    }

    // Send immediately
    beat();

    // Then periodically
    setInterval(beat, Math.floor(ttlMs / 2));
}

module.exports = {
    autoRegister,
    startHeartbeat
};