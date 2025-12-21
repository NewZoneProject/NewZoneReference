/**
 * Analytics Microservice
 * Minimal analytics and aggregation for NewZoneReference
 * Pure Node.js, no dependencies
 */

const METRICS = {
  events_by_source: {},
  events_by_type: {},
  total_events: 0,
  last_updated: null
};

export async function fetchLoggingEvents(limit = 200) {
  try {
    const res = await fetch(`http://logging-service:3006/events?limit=${limit}`);
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchBusEvents(limit = 200) {
  try {
    const res = await fetch(`http://event-service:3008/events?limit=${limit}`);
    return await res.json();
  } catch {
    return [];
  }
}

export async function recomputeMetrics() {
  const loggingEvents = await fetchLoggingEvents(200);
  const busEvents = await fetchBusEvents(200);

  const all = [...loggingEvents, ...busEvents];

  const events_by_source = {};
  const events_by_type = {};
  let total = 0;

  for (const ev of all) {
    total++;

    const src = ev.source || "unknown";
    const type = ev.type || "unknown";

    events_by_source[src] = (events_by_source[src] || 0) + 1;
    events_by_type[type] = (events_by_type[type] || 0) + 1;
  }

  METRICS.events_by_source = events_by_source;
  METRICS.events_by_type = events_by_type;
  METRICS.total_events = total;
  METRICS.last_updated = Date.now();

  return METRICS;
}

export function getMetrics() {
  return METRICS;
}