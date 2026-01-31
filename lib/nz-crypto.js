// NZ-CRYPTO-01 — unified cryptographic layer for all NewZone microservices.
// This module defines the protocol logic (signing, verification, encryption,
// decryption, session key derivation) and deterministic key derivation from
// NZ-CRYPTO-SEED-01 (24-word seed + password).
// Actual asymmetric primitives (Ed25519, X25519) must be provided by an adapter
// (e.g. nz-crypto-adapter-noble.js).

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const te = new TextEncoder();
const td = new TextDecoder();

async function sha256(bytes) {
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(buf);
}

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
// NZ-CRYPTO-SEED-01: mnemonic + password → master_secret → key tree
// ------------------------------------------------------------

async function mnemonicToSeed(mnemonic) {
  const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  const bytes = te.encode(normalized);
  return await sha256(bytes); // 32-byte deterministic seed
}

async function simpleKDF(seedBytes, passwordBytes) {
  const combined = new Uint8Array(seedBytes.length + passwordBytes.length);
  combined.set(seedBytes);
  combined.set(passwordBytes, seedBytes.length);

  let out = combined;
  for (let i = 0; i < 1000; i++) {
    out = await sha256(out);
  }
  return out; // 32 bytes
}

export async function deriveMasterSecret(mnemonic, password) {
  const seed = await mnemonicToSeed(mnemonic);
  const pwd = te.encode(password);
  return await simpleKDF(seed, pwd); // 32-byte master_secret
}

async function hkdfRaw(master, info, length = 32, saltStr = 'NZ-CRYPTO-SEED-v0.1') {
  const salt = te.encode(saltStr);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    master,
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
    length * 8
  );
  return new Uint8Array(bits);
}

export async function deriveSeedKey(masterSecret, path) {
  const info = 'nz:' + path;
  return await hkdfRaw(masterSecret, info, 32);
}

// Convenience: full chain from mnemonic + password + path
export async function deriveSeedKeyFromMnemonic(mnemonic, password, path) {
  const master = await deriveMasterSecret(mnemonic, password);
  return await deriveSeedKey(master, path);
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
      const salt = new Uint8Array(32); // zero salt (session-level)
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
    async encrypt(rawKeyUint8, plaintextUint8, aadUint8) {
      const key = await this.importKey(rawKeyUint8);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const params = {
        name: 'AES-GCM',
        iv
      };
      if (aadUint8) params.additionalData = aadUint8;
      const ciphertextBuf = await crypto.subtle.encrypt(
        params,
        key,
        plaintextUint8
      );
      return {
        iv,
        ciphertext: new Uint8Array(ciphertextBuf)
      };
    },
    async decrypt(rawKeyUint8, ivUint8, ciphertextUint8, aadUint8) {
      const key = await this.importKey(rawKeyUint8);
      const params = {
        name: 'AES-GCM',
        iv: ivUint8
      };
      if (aadUint8) params.additionalData = aadUint8;
      const plaintextBuf = await crypto.subtle.decrypt(
        params,
        key,
        ciphertextUint8
      );
      return new Uint8Array(plaintextBuf);
    }
  },
  stream: {
    // ChaCha20 stream cipher (no Poly1305, for deterministic symmetric use)
    chacha20Encrypt,
    chacha20Decrypt
  }
};

// ------------------------------------------------------------
// ChaCha20 (pure JS stream cipher)
// ------------------------------------------------------------

function u32(x) {
  return x >>> 0;
}

function rotl(x, n) {
  return u32((x << n) | (x >>> (32 - n)));
}

function quarterRound(state, a, b, c, d) {
  state[a] = u32(state[a] + state[b]); state[d] = rotl(state[d] ^ state[a], 16);
  state[c] = u32(state[c] + state[d]); state[b] = rotl(state[b] ^ state[c], 12);
  state[a] = u32(state[a] + state[b]); state[d] = rotl(state[d] ^ state[a], 8);
  state[c] = u32(state[c] + state[d]); state[b] = rotl(state[b] ^ state[c], 7);
}

function chacha20Block(key, counter, nonce) {
  const constants = new Uint32Array([
    0x61707865, 0x3320646e, 0x79622d32, 0x6b206574
  ]);

  const k = new Uint32Array(8);
  for (let i = 0; i < 8; i++) {
    k[i] =
      key[4 * i] |
      (key[4 * i + 1] << 8) |
      (key[4 * i + 2] << 16) |
      (key[4 * i + 3] << 24);
  }

  const n = new Uint32Array(3);
  for (let i = 0; i < 3; i++) {
    n[i] =
      nonce[4 * i] |
      (nonce[4 * i + 1] << 8) |
      (nonce[4 * i + 2] << 16) |
      (nonce[4 * i + 3] << 24);
  }

  const state = new Uint32Array(16);
  state.set(constants, 0);
  state.set(k, 4);
  state[12] = counter >>> 0;
  state[13] = n[0];
  state[14] = n[1];
  state[15] = n[2];

  const working = new Uint32Array(state);

  for (let i = 0; i < 10; i++) {
    quarterRound(working, 0, 4, 8, 12);
    quarterRound(working, 1, 5, 9, 13);
    quarterRound(working, 2, 6, 10, 14);
    quarterRound(working, 3, 7, 11, 15);
    quarterRound(working, 0, 5, 10, 15);
    quarterRound(working, 1, 6, 11, 12);
    quarterRound(working, 2, 7, 8, 13);
    quarterRound(working, 3, 4, 9, 14);
  }

  const out = new Uint8Array(64);
  for (let i = 0; i < 16; i++) {
    const x = u32(working[i] + state[i]);
    out[4 * i] = x & 0xff;
    out[4 * i + 1] = (x >>> 8) & 0xff;
    out[4 * i + 2] = (x >>> 16) & 0xff;
    out[4 * i + 3] = (x >>> 24) & 0xff;
  }

  return out;
}

function chacha20Xor(key, nonce, counter, input) {
  const out = new Uint8Array(input.length);
  let blockCount = counter >>> 0;
  let offset = 0;

  while (offset < input.length) {
    const block = chacha20Block(key, blockCount, nonce);
    const len = Math.min(64, input.length - offset);
    for (let i = 0; i < len; i++) {
      out[offset + i] = input[offset + i] ^ block[i];
    }
    offset += len;
    blockCount++;
  }

  return out;
}

export function chacha20Encrypt(key, nonce, counter, plaintext) {
  return chacha20Xor(key, nonce, counter, plaintext);
}

export function chacha20Decrypt(key, nonce, counter, ciphertext) {
  return chacha20Xor(key, nonce, counter, ciphertext);
}

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
// Encrypt / decrypt packet (AES-GCM)
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