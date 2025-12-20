/**
 * Consensus Microservice
 * Stateless consensus integrity proofs
 * Based on NZ-0046 (Consensus Integrity Proofs)
 * and NZ-0058 (Consensus Forward Proofs)
 *
 * Portable Vanilla JS, no external dependencies.
 */

import crypto from "crypto";

/**
 * Generate deterministic consensus proof
 * @param {object} payload - arbitrary JSON object representing consensus input
 * @returns {string} proof_id
 */
export function generateConsensusProof(payload) {
  const json = JSON.stringify(payload);
  const hash = crypto.createHash("sha256").update(json).digest("hex");
  // Consensus proofs use full 64-char SHA-256
  return hash;
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

/**
 * Example usage (stateless API simulation)
 */
if (require.main === module) {
  const payload = { round: 1, votes: ["A", "B", "A"] };
  const proof = generateConsensusProof(payload);
  console.log("Generated Consensus Proof:", proof);
  console.log("Verification:", verifyConsensusProof(payload, proof));
}