// Module: Consensus Microservice Core
// Description: Stateless consensus integrity proofs (NZ-0046, NZ-0058)
// File: index.js

import crypto from "node:crypto";

/**
 * Generate deterministic consensus proof
 * @param {object} payload - arbitrary JSON object representing consensus input
 * @returns {string} proof_id
 */
export function generateConsensusProof(payload) {
    const json = JSON.stringify(payload);
    const hash = crypto.createHash("sha256").update(json).digest("hex");
    return hash; // full 64-char SHA-256
}

/**
 * Verify consensus proof
 * @param {object} payload - original JSON object
 * @param {string} proof_id - expected proof
 * @returns {boolean}
 */
export function verifyConsensusProof(payload, proof_id) {
    return generateConsensusProof(payload) === proof_id;
}

// Optional CLI test
if (import.meta.main) {
    const payload = { round: 1, votes: ["A", "B", "A"] };
    const proof = generateConsensusProof(payload);
    console.log("Generated Consensus Proof:", proof);
    console.log("Verification:", verifyConsensusProof(payload, proof));
}