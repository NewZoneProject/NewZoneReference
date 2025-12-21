/**
 * Rules / Policy Microservice
 * Minimal rule engine for NewZoneReference
 * Pure Node.js, no dependencies
 */

const RULES = [];
const MAX_RULES = 200;

/**
 * Add rule
 */
export function addRule(condition, action) {
  const id = "rule-" + Math.random().toString(36).slice(2, 10);

  const rule = {
    id,
    condition,
    action,
    ts: Date.now()
  };

  RULES.push(rule);
  if (RULES.length > MAX_RULES) RULES.shift();

  return rule;
}

/**
 * List rules
 */
export function listRules() {
  return RULES;
}

/**
 * Remove rule
 */
export function removeRule(id) {
  const idx = RULES.findIndex(r => r.id === id);
  if (idx !== -1) RULES.splice(idx, 1);
}

/**
 * Evaluate a single rule
 */
async function evaluateRule(rule, context) {
  const { condition, action } = rule;

  // Condition: simple key/value match
  const key = condition.key;
  const value = condition.value;

  if (context[key] !== value) return;

  // Action types
  if (action.type === "event") {
    try {
      await fetch("http://event-service:3008/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: action.event_type,
          source: "rules",
          payload: action.payload || null
        })
      });
    } catch {}
  }

  if (action.type === "queue") {
    try {
      await fetch("http://queue-service:3013/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queue: action.queue,
          payload: action.payload || null
        })
      });
    } catch {}
  }

  if (action.type === "state") {
    try {
      await fetch("http://state-service:3011/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: action.key,
          value: action.value
        })
      });
    } catch {}
  }

  if (action.type === "callback") {
    try {
      await fetch(action.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context)
      });
    } catch {}
  }
}

/**
 * Evaluate all rules against a context
 */
export async function evaluateRules(context) {
  for (const rule of RULES) {
    await evaluateRule(rule, context);
  }
}