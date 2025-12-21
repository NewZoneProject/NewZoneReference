/**
 * Queue Microservice
 * Minimal FIFO queue system for NewZoneReference
 * Pure Node.js, no dependencies
 */

const QUEUES = {};
const MAX_QUEUE_SIZE = 500;

/**
 * Ensure queue exists
 */
function ensureQueue(name) {
  if (!QUEUES[name]) QUEUES[name] = [];
}

/**
 * Enqueue item
 */
export function enqueue(queue, payload) {
  ensureQueue(queue);

  const item = {
    ts: Date.now(),
    payload
  };

  QUEUES[queue].push(item);

  // bounded memory
  if (QUEUES[queue].length > MAX_QUEUE_SIZE) {
    QUEUES[queue].shift();
  }

  return item;
}

/**
 * Dequeue item
 */
export function dequeue(queue) {
  ensureQueue(queue);

  if (QUEUES[queue].length === 0) return null;

  return QUEUES[queue].shift();
}

/**
 * Peek queue
 */
export function peek(queue, limit = 10) {
  ensureQueue(queue);
  return QUEUES[queue].slice(0, limit);
}

/**
 * List queues
 */
export function listQueues() {
  return Object.keys(QUEUES).map(name => ({
    name,
    size: QUEUES[name].length
  }));
}