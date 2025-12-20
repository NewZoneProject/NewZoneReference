/**
 * Identity Microservice
 * Stateless ID generation & verification
 * Based on NZ-0002, NZ-0032, NZ-0056
 *
 * Portable Vanilla JS, no external dependencies.
 */

import crypto from "crypto";

/**
 * Generate deterministic identity ID
 * @param {string} input - arbitrary string (e.g. username, public key)
 * @returns {string} identity_id
 */
export function generateIdentity(input) {
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  // Fixed-width identity: 32 chars
  return hash.slice(0, 32);
}

/**
 * Verify identity ID
 * @param {string} input - original string
 * @param {string} identity_id - expected ID
 * @returns {boolean}
 */
export function verifyIdentity(input, identity_id) {
  return generateIdentity(input) === identity_id;
}

/**
 * Example usage (stateless API simulation)
 */
if (require.main === module) {
  const id = generateIdentity("oleg@example");
  console.log("Generated ID:", id);
  console.log("Verification:", verifyIdentity("oleg@example", id));
}