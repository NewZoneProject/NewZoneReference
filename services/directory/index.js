/**
 * Directory / Discovery Microservice
 * Minimal service registry for NewZoneReference
 * Pure Node.js, no dependencies
 */

const SERVICES = [];
const MAX_SERVICES = 200;

/**
 * Register a service
 */
export function registerService(role, url) {
  const id = "svc-" + Math.random().toString(36).slice(2, 10);

  const entry = {
    id,
    role,
    url,
    ts: Date.now()
  };

  SERVICES.push(entry);
  if (SERVICES.length > MAX_SERVICES) SERVICES.shift();

  return entry;
}

/**
 * List all services
 */
export function listServices() {
  return SERVICES;
}

/**
 * Find by role
 */
export function findByRole(role) {
  return SERVICES.filter(s => s.role === role);
}

/**
 * Remove service
 */
export function removeService(id) {
  const idx = SERVICES.findIndex(s => s.id === id);
  if (idx !== -1) SERVICES.splice(idx, 1);
}