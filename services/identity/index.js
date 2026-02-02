// Module: Identity Microservice Core
// Description: Stateless ID generation and verification (NZ-0002, NZ-0032, NZ-0056)
// File: index.js

const crypto = require("crypto");

/**
 * Generate deterministic identity ID
 * @param {string} input - arbitrary string (e.g. username, public key)
 * @returns {string} identity_id
 */
function generateIdentity(input) {
    const hash = crypto.createHash("sha256").update(input).digest("hex");
    return hash.slice(0, 32); // fixed-width identity
}

/**
 * Verify identity ID
 * @param {string} input - original string
 * @param {string} identity_id - expected ID
 * @returns {boolean}
 */
function verifyIdentity(input, identity_id) {
    return generateIdentity(input) === identity_id;
}

module.exports = {
    generateIdentity,
    verifyIdentity
};

// Optional CLI test
if (require.main === module) {
    const id = generateIdentity("oleg@example");
    console.log("Generated ID:", id);
    console.log("Verification:", verifyIdentity("oleg@example", id));
}