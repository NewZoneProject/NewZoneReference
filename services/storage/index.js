/**
 * Storage Microservice
 * Minimal content-addressed object store
 * Stateless API, in-memory storage
 * Based on NewZone storage principles (NZ-0038, NZ-0040, NZ-0059)
 */

import crypto from "crypto";

// In-memory store: { hash_id: object }
const STORE = {};

/**
 * Generate deterministic SHA-256 hash for any JSON object
 * @param {object} payload
 * @returns {string} hash_id
 */
export function generateHash(payload) {
  const json = JSON.stringify(payload);
  return crypto.createHash("sha256").update(json).digest("hex");
}

/**
 * Store object by its hash
 * @param {object} payload
 * @returns {string} hash_id
 */
export function storeObject(payload) {
  const hash_id = generateHash(payload);
  STORE[hash_id] = payload;
  return hash_id;
}

/**
 * Retrieve object by hash
 * @param {string} hash_id
 * @returns {object|null}
 */
export function getObject(hash_id) {
  return STORE[hash_id] || null;
}

/**
 * Verify object integrity
 * @param {object} payload
 * @param {string} hash_id
 * @returns {boolean}
 */
export function verifyObject(payload, hash_id) {
  return generateHash(payload) === hash_id;
}