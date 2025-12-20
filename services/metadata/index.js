/**
 * Metadata Microservice
 * Stateless metadata integrity proofs
 * Based on NZ-0037, NZ-0057
 *
 * Portable Vanilla JS, no external dependencies.
 */

import crypto from "crypto";

/**
 * Generate deterministic metadata proof
 * @param {object} metadata - arbitrary JSON object
 * @returns {string} proof_id
 */
export function generateMetadataProof(metadata) {
  const json = JSON.stringify(metadata);
  const hash = crypto.createHash("sha256").update(json).digest("hex");
  // Fixed-width proof: 64 chars
  return hash;
}

/**
 * Verify metadata proof
 * @param {object} metadata - original JSON object
 * @param {string} proof_id - expected proof
 * @returns {boolean}
 */
export function verifyMetadataProof(metadata, proof_id) {
  return generateMetadataProof(metadata) === proof_id;
}

/**
 * Example usage (stateless API simulation)
 */
if (require.main === module) {
  const metadata = { doc: "contract", version: 1 };
  const proof = generateMetadataProof(metadata);
  console.log("Generated Proof:", proof);
  console.log("Verification:", verifyMetadataProof(metadata, proof));
}