// Minimal key generator for NewZoneReference.
// Generates Ed25519 + X25519 keypairs and writes keys/node.json.
// Requires nz-crypto-adapter-noble.js to be available.

import fs from 'fs';
import path from 'path';
import crypto from '../lib/nz-crypto-adapter-noble.js';

// Simple fingerprint: first 32 hex chars of SHA-256(publicKey)
async function fingerprint(pubKey) {
  const hashBuf = await globalThis.crypto.subtle.digest(
    'SHA-256',
    pubKey
  );
  const hashArr = Array.from(new Uint8Array(hashBuf));
  const hex = hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 32);
}

async function main() {
  console.log('Generating Ed25519 + X25519 keypairs...');

  // --- Ed25519 ---
  const ed = await crypto.ed25519.generateKeyPair();

  // --- X25519 ---
  const x = await crypto.x25519.generateKeyPair();

  // --- Node ID ---
  const fp = await fingerprint(ed.publicKey);
  const nodeId = `nzid:node:${fp}`;

  const out = {
    node_id: nodeId,

    ed25519_public: Buffer.from(ed.publicKey).toString('base64'),
    ed25519_private: Buffer.from(ed.privateKey).toString('base64'),

    x25519_public: Buffer.from(x.publicKey).toString('base64'),
    x25519_private: Buffer.from(x.privateKey).toString('base64'),

    created_at: new Date().toISOString()
  };

  const dir = path.resolve('./keys');
  const file = path.resolve('./keys/node.json');

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2));

  console.log('Keys generated successfully.');
  console.log('Saved to: keys/node.json');
  console.log('Node ID:', nodeId);
}

main();