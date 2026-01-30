// NZ-CRYPTO-01 — unified cryptographic layer for all NewZone microservices.
// This module defines the protocol logic (signing, verification, encryption,
// decryption, session key derivation). Actual crypto primitives (Ed25519,
// X25519) must be provided by an adapter (e.g. nz-crypto-adapter-noble.js).

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const te = new TextEncoder();
const td = new TextDecoder();

async function sha256Hex(obj) {
  const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
  const data = te.encode(json);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

function canonicalize(obj) {
  const keys = Object.keys(obj).sort();
  const res = {};
  for (const k of keys) {
    if (obj[k] !== undefined) res[k] = obj[k];
  }
  return res;
}

function u8ToB64(u8) {
  return btoa(String.fromCharCode(...u8));
}

function b64ToU8(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

// ------------------------------------------------------------
// Crypto interface (filled by adapter)
// ------------------------------------------------------------

export const nzCrypto = {
  ed25519: {
    // sign(msgUint8, privUint8) -> Uint8Array(64)
    // verify(sigUint8, msgUint8, pubUint8) -> boolean
    // generateKeyPair() -> { publicKey, privateKey }
  },
  x25519: {
    // deriveSharedSecret(privUint8, pubUint8) -> Uint8Array(32)
    // generateKeyPair() -> { publicKey, privateKey }
  },
  hkdf: {
    async deriveKey(sharedSecretUint8, info = 'nz-session', keyLen = 32) {
      const salt = new Uint8Array(32); // zero salt (can be replaced)
      const baseKey = await crypto.subtle.importKey(
        'raw',
        sharedSecretUint8,
        { name: 'HKDF' },
        false,
        ['deriveBits']
      );
      const bits = await crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt,
          info: te.encode(info)
        },
        baseKey,
        keyLen * 8
      );
      return new Uint8Array(bits);
    }
  },
  aead: {
    async importKey(rawKeyUint8) {
      return await crypto.subtle.importKey(
        'raw',
        rawKeyUint8,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    },
    async encrypt(rawKeyUint8, plaintextUint8) {
      const key = await this.importKey(rawKeyUint8);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertextBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        plaintextUint8
      );
      return {
        iv,
        ciphertext: new Uint8Array(ciphertextBuf)
      };
    },
    async decrypt(rawKeyUint8, ivUint8, ciphertextUint8) {
      const key = await this.importKey(rawKeyUint8);
      const plaintextBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivUint8 },
        key,
        ciphertextUint8
      );
      return new Uint8Array(plaintextBuf);
    }
  }
};

// ------------------------------------------------------------
// Build signed packet { auth, body }
// ------------------------------------------------------------

export async function buildSignedPacket({ nodeId, privateKey, body }) {
  const bodyHash = await sha256Hex(body);

  const auth = {
    node_id: nodeId,
    timestamp: Math.floor(Date.now() / 1000),
    nonce: crypto.getRandomValues(new Uint32Array(4)).join('-'),
    body_hash: bodyHash
  };

  const canonicalAuth = canonicalize(auth);
  const authHashHex = await sha256Hex(canonicalAuth);
  const msgBytes = te.encode(authHashHex);

  if (!nzCrypto.ed25519.sign) {
    throw new Error('nzCrypto.ed25519.sign is not implemented');
  }

  const sigBytes = await nzCrypto.ed25519.sign(msgBytes, privateKey);
  const signature = u8ToB64(sigBytes);

  return {
    auth: { ...auth, signature },
    body
  };
}

// ------------------------------------------------------------
// Verify signed packet
// ------------------------------------------------------------

export async function verifySignedPacket({
  packet,
  getPublicKeyByNodeId,
  maxSkewSec = 300,
  isNonceSeen
}) {
  const { auth, body } = packet || {};
  if (!auth || !body) return { ok: false, reason: 'missing_auth_or_body' };

  const { node_id, timestamp, nonce, body_hash, signature } = auth;
  if (!node_id || !timestamp || !nonce || !body_hash || !signature) {
    return { ok: false, reason: 'missing_auth_fields' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > maxSkewSec) {
    return { ok: false, reason: 'timestamp_out_of_range' };
  }

  if (isNonceSeen) {
    const replay = await isNonceSeen(node_id, nonce);
    if (replay) return { ok: false, reason: 'replay_nonce' };
  }

  const realBodyHash = await sha256Hex(body);
  if (realBodyHash !== body_hash) {
    return { ok: false, reason: 'body_hash_mismatch' };
  }

  const { signature: _, ...authWithoutSig } = auth;
  const canonicalAuth = canonicalize(authWithoutSig);
  const authHashHex = await sha256Hex(canonicalAuth);
  const msgBytes = te.encode(authHashHex);

  const pubKey = await getPublicKeyByNodeId(node_id);
  if (!pubKey) return { ok: false, reason: 'unknown_node' };

  if (!nzCrypto.ed25519.verify) {
    throw new Error('nzCrypto.ed25519.verify is not implemented');
  }

  const sigBytes = b64ToU8(signature);
  const ok = await nzCrypto.ed25519.verify(sigBytes, msgBytes, pubKey);
  if (!ok) return { ok: false, reason: 'invalid_signature' };

  return { ok: true, node_id };
}

// ------------------------------------------------------------
// Session key derivation (X25519 + HKDF)
// ------------------------------------------------------------

export async function deriveSessionKey({
  ourPrivX25519,
  theirPubX25519,
  info = 'nz-session'
}) {
  if (!nzCrypto.x25519.deriveSharedSecret) {
    throw new Error('nzCrypto.x25519.deriveSharedSecret is not implemented');
  }
  const shared = await nzCrypto.x25519.deriveSharedSecret(
    ourPrivX25519,
    theirPubX25519
  );
  const sessionKey = await nzCrypto.hkdf.deriveKey(shared, info, 32);
  return sessionKey;
}

// ------------------------------------------------------------
// Encrypt / decrypt packet
// ------------------------------------------------------------

export async function encryptPacket({
  packet,
  sessionKey,
  cipher = 'aes-256-gcm',
  senderNodeId,
  receiverNodeId
}) {
  const json = JSON.stringify(packet);
  const plaintext = te.encode(json);

  if (!nzCrypto.aead.encrypt) {
    throw new Error('nzCrypto.aead.encrypt is not implemented');
  }

  const { iv, ciphertext } = await nzCrypto.aead.encrypt(sessionKey, plaintext);

  return {
    version: 'nz-crypto-01',
    cipher,
    sender_node_id: senderNodeId,
    receiver_node_id: receiverNodeId,
    iv: u8ToB64(iv),
    ciphertext: u8ToB64(ciphertext)
  };
}

export async function decryptPacket({ packet, sessionKey }) {
  if (packet.version !== 'nz-crypto-01') {
    throw new Error(`Unsupported crypto version: ${packet.version}`);
  }

  if (!nzCrypto.aead.decrypt) {
    throw new Error('nzCrypto.aead.decrypt is not implemented');
  }

  const iv = b64ToU8(packet.iv);
  const ciphertext = b64ToU8(packet.ciphertext);
  const plaintext = await nzCrypto.aead.decrypt(sessionKey, iv, ciphertext);
  const json = td.decode(plaintext);
  return JSON.parse(json);
}