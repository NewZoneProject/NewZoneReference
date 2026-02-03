// Module: NZ Crypto Routing
// Description: Signed routing packets (nz-routing-crypto-01) for inter-service communication in NewZoneReference.
// Run: node nz-crypto-routing.js (for local testing only)
// File: nz-crypto-routing.js

const crypto = require("crypto");

/**
 * Deterministic JSON stringify (stable key order)
 * @param {any} value
 * @returns {string}
 */
function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return "[" + value.map(v => stableStringify(v)).join(",") + "]";
    }

    const keys = Object.keys(value).sort();
    const entries = keys.map(k => JSON.stringify(k) + ":" + stableStringify(value[k]));
    return "{" + entries.join(",") + "}";
}

/**
 * Build canonical signing payload from routing packet fields (without signature)
 * @param {object} packet
 * @returns {Buffer}
 */
function buildSigningPayload(packet) {
    const { version, node_id, ts, nonce, payload } = packet;
    const canonical = { version, node_id, ts, nonce, payload };
    return Buffer.from(stableStringify(canonical), "utf8");
}

/**
 * Sign routing packet (nz-routing-crypto-01)
 * @param {object} params
 * @param {object} params.nodeKeys - { ed25519_private, ed25519_public } (base64)
 * @param {string} params.nodeId
 * @param {any} params.payload
 * @returns {object} signed packet
 */
function signRoutingPacket({ nodeKeys, nodeId, payload }) {
    if (!nodeKeys || !nodeKeys.ed25519_private || !nodeKeys.ed25519_public) {
        throw new Error("Missing nodeKeys for signRoutingPacket");
    }

    const packet = {
        version: "nz-routing-crypto-01",
        node_id: nodeId,
        ts: Date.now(),
        nonce: crypto.randomBytes(8).toString("hex"),
        payload
    };

    const signingPayload = buildSigningPayload(packet);
    const privateKey = crypto.createPrivateKey({
        key: Buffer.from(nodeKeys.ed25519_private, "base64"),
        format: "der",
        type: "pkcs8"
    });

    const signature = crypto.sign(null, signingPayload, privateKey);
    packet.signature = signature.toString("base64");

    return packet;
}

/**
 * Verify routing packet (nz-routing-crypto-01)
 * @param {object} params
 * @param {object} params.packet
 * @param {function} params.getPublicKeyByNodeId - async (nodeId) => Buffer (raw public key) or null
 * @param {number} [params.maxSkewSec=300]
 * @returns {Promise<{ ok: boolean, node_id?: string, payload?: any, reason?: string }>}
 */
async function verifyRoutingPacket({ packet, getPublicKeyByNodeId, maxSkewSec = 300 }) {
    if (!packet || packet.version !== "nz-routing-crypto-01") {
        return { ok: false, reason: "unsupported-version" };
    }

    const { node_id, ts, nonce, payload, signature } = packet;

    if (!node_id || typeof node_id !== "string") {
        return { ok: false, reason: "missing-node-id" };
    }

    if (typeof ts !== "number" || !Number.isFinite(ts)) {
        return { ok: false, reason: "invalid-ts" };
    }

    if (!nonce || typeof nonce !== "string") {
        return { ok: false, reason: "invalid-nonce" };
    }

    if (!signature || typeof signature !== "string") {
        return { ok: false, reason: "missing-signature" };
    }

    const now = Date.now();
    const skewMs = Math.abs(now - ts);
    if (skewMs > maxSkewSec * 1000) {
        return { ok: false, reason: "ts-skew" };
    }

    const publicKeyRaw = await getPublicKeyByNodeId(node_id);
    if (!publicKeyRaw) {
        return { ok: false, reason: "unknown-node" };
    }

    const publicKey = crypto.createPublicKey({
        key: publicKeyRaw,
        format: "der",
        type: "spki"
    });

    const signingPayload = buildSigningPayload(packet);
    const sig = Buffer.from(signature, "base64");

    const ok = crypto.verify(null, signingPayload, publicKey, sig);
    if (!ok) {
        return { ok: false, reason: "invalid-signature" };
    }

    return {
        ok: true,
        node_id,
        payload
    };
}

module.exports = {
    signRoutingPacket,
    verifyRoutingPacket
};