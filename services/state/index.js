/**
 * State Microservice
 * Minimal key-value state store for NewZoneReference
 * Pure Node.js, no dependencies
 */

const STATE = {};
const MAX_KEYS = 500;

/**
 * Set state value
 */
export function setState(key, value) {
  if (Object.keys(STATE).length >= MAX_KEYS && !STATE[key]) {
    // remove oldest key
    const oldest = Object.keys(STATE).sort(
      (a, b) => STATE[a].ts - STATE[b].ts
    )[0];
    delete STATE[oldest];
  }

  STATE[key] = {
    value,
    ts: Date.now()
  };

  return STATE[key];
}

/**
 * Get state value
 */
export function getState(key) {
  return STATE[key] || null;
}

/**
 * Delete state value
 */
export function deleteState(key) {
  delete STATE[key];
}

/**
 * List keys
 */
export function listKeys() {
  return Object.keys(STATE);
}