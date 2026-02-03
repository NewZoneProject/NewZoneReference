// Module: Rules Microservice Core
// Description: Minimal rule engine for NewZoneReference (history_rule → replication/logging/analytics).
// File: index.js

const { PORTS } = require("../../config/ports.js");

// Single declarative rule for history flow
// Config is set via /set with key = "history_rule"
let HISTORY_RULE = {
    replicate: false,
    log: false,
    analytics: false
};

/**
 * Set history rule config
 * @param {object} value
 */
function setHistoryRule(value) {
    if (!value || typeof value !== "object") return;
    HISTORY_RULE = {
        ...HISTORY_RULE,
        ...value
    };
}

/**
 * Get current history rule config
 * @returns {object}
 */
function getHistoryRule() {
    return HISTORY_RULE;
}

/**
 * Apply replication action
 * @param {object} context
 */
async function applyReplication(context) {
    try {
        await fetch(`http://localhost:${PORTS.replication}/replicate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(context)
        });
    } catch {
        // soft-fail, no throw
    }
}

/**
 * Apply logging action
 * @param {object} context
 */
async function applyLogging(context) {
    try {
        await fetch(`http://localhost:${PORTS.logging}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                source: "rules",
                event: "history_event",
                payload: context
            })
        });
    } catch {
        // soft-fail
    }
}

/**
 * Apply analytics action
 * @param {object} context
 */
async function applyAnalytics(context) {
    try {
        await fetch(`http://localhost:${PORTS.analytics}/record`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(context)
        });
    } catch {
        // soft-fail
    }
}

/**
 * Evaluate rules for given context
 * For B1: single history_rule applied to all history events.
 * @param {object} context
 */
async function evaluateRules(context) {
    const cfg = HISTORY_RULE;

    if (cfg.replicate) {
        await applyReplication(context);
    }

    if (cfg.log) {
        await applyLogging(context);
    }

    if (cfg.analytics) {
        await applyAnalytics(context);
    }
}

module.exports = {
    setHistoryRule,
    getHistoryRule,
    evaluateRules
};