// Module: Metadata Microservice Core
// Description: Stateless metadata integrity proofs (NZ-0037, NZ-0057)
// File: index.js

const crypto = require("crypto");

/**
 * Generate deterministic metadata proof
 * @param {object} metadata - arbitrary JSON object
 * @returns {string} proof_id
 */
function generateMetadataProof(metadata) {
    const json = JSON.stringify(metadata);
    const hash = crypto.createHash("sha256").update(json).digest("hex");
    return hash; // fixed-width 64-char SHA-256
}

/**
 * Verify metadata proof
 * @param {object} metadata - original JSON object
 * @param {string} proof_id - expected proof
 * @returns {boolean}
 */
function verifyMetadataProof(metadata, proof_id) {
    return generateMetadataProof(metadata) === proof_id;
}

module.exports = {
    generateMetadataProof,
    verifyMetadataProof
};

// Optional CLI test
if (require.main === module) {
    const metadata = { doc: "contract", version: 1 };
    const proof = generateMetadataProof(metadata);
    console.log("Generated Proof:", proof);
    console.log("Verification:", verifyMetadataProof(metadata, proof));
}