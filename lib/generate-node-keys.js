// Module: Node Key Generator
// Description: Auto-generate Ed25519 keypair + node_id on first launch.
// File: generate-node-keys.js

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

/**
 * Ensure keys/node.json exists.
 * If missing — generate Ed25519 keypair + node_id.
 * @param {string} baseDir - usually __dirname of the service
 * @returns {object} nodeKeys
 */
function generateNodeKeysIfMissing(baseDir) {
    const keysDir = path.join(baseDir, "keys");
    const keyFile = path.join(keysDir, "node.json");

    // If exists — load and return
    if (fs.existsSync(keyFile)) {
        try {
            const raw = fs.readFileSync(keyFile, "utf8");
            return JSON.parse(raw);
        } catch {
            // If corrupted — regenerate
        }
    }

    // Ensure keys/ directory exists
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }

    // Generate Ed25519 keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

    const ed25519_public = publicKey.export({ type: "spki", format: "der" }).toString("base64");
    const ed25519_private = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");

    // Generate node_id (serviceName.randomHex)
    const serviceName = path.basename(baseDir);
    const node_id = `${serviceName}.${crypto.randomBytes(4).toString("hex")}`;

    const nodeKeys = {
        node_id,
        ed25519_public,
        ed25519_private
    };

    fs.writeFileSync(keyFile, JSON.stringify(nodeKeys, null, 2));

    return nodeKeys;
}

module.exports = {
    generateNodeKeysIfMissing
};