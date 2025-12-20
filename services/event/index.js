/**
 * Event Microservice
 * Minimal event bus for NewZoneReference
 * Pure Node.js, no dependencies
 */

const EVENTS = [];
const SUBSCRIPTIONS = [];
const MAX_EVENTS = 500;

/**
 * Publish event
 */
export function publishEvent(type, source, payload = null) {
  const event = {
    ts: Date.now(),
    type,
    source,
    payload
  };

  EVENTS.push(event);
  if (EVENTS.length > MAX_EVENTS) EVENTS.shift();

  // Notify subscribers
  for (const sub of SUBSCRIPTIONS) {
    if (sub.type === type) {
      try {
        fetch(sub.callback, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event)
        });
      } catch {
        // ignore errors
      }
    }
  }

  return event;
}

/**
 * Get events by type
 */
export function getEvents(type = null, limit = 50) {
  const filtered = type
    ? EVENTS.filter(e => e.type === type)
    : EVENTS;

  return filtered.slice(-limit);
}

/**
 * Add subscription
 */
export function addSubscription(type, callback) {
  const id = "sub-" + Math.random().toString(36).slice(2, 10);

  SUBSCRIPTIONS.push({ id, type, callback });

  return id;
}

/**
 * Remove subscription
 */
export function removeSubscription(id) {
  const idx = SUBSCRIPTIONS.findIndex(s => s.id === id);
  if (idx !== -1) SUBSCRIPTIONS.splice(idx, 1);
}

/**
 * List subscriptions
 */
export function listSubscriptions() {
  return SUBSCRIPTIONS;
}