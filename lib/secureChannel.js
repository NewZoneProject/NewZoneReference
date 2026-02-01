// ============================================================================
// SecureChannel: bidirectional secure channel abstraction
// X25519 sharedSecret → HKDF session keys → ChaCha20-Poly1305 AEAD
//
// Rekeying:
//   - The channel maintains an epoch counter.
//   - Keys are derived from (sharedSecret, baseContext, epoch, direction).
//   - rekey() increments the epoch and re-derives send/recv keys and nonce bases.
//
// File: lib/secureChannel.js
// ============================================================================

const { deriveSessionKeys } = require("./sessionKeys.js");
const { encrypt, decrypt } = require("./chacha20poly1305.js");

function toBytes(input) {
  if (input == null) return new Uint8Array(0);
  if (input instanceof Uint8Array) return input;
  if (Buffer.isBuffer(input)) return new Uint8Array(input);
  if (typeof input === "string") return new Uint8Array(Buffer.from(input, "utf8"));
  throw new Error("secureChannel: unsupported input type");
}

function makeNonce(nonceBase, counter) {
  if (nonceBase.length !== 12) {
    throw new Error("secureChannel: nonceBase must be 12 bytes");
  }
  const nonce = new Uint8Array(12);
  nonce.set(nonceBase);
  nonce[8] = (counter >>> 24) & 0xff;
  nonce[9] = (counter >>> 16) & 0xff;
  nonce[10] = (counter >>> 8) & 0xff;
  nonce[11] = counter & 0xff;
  return nonce;
}

class SecureChannel {
  /**
   * @param {Object} params
   * @param {Uint8Array|Buffer} params.sharedSecret - X25519 shared secret
   * @param {string} params.baseContext - base protocol context
   * @param {"alice"|"bob"} params.role - local role
   * @param {"sha512"|"blake2b"} [params.hash="sha512"] - HKDF hash
   * @param {number} [params.keyLength=32] - AEAD key length
   */
  constructor(params) {
    const {
      sharedSecret,
      baseContext,
      role,
      hash = "sha512",
      keyLength = 32,
    } = params || {};

    if (!sharedSecret) throw new Error("SecureChannel: sharedSecret is required");
    if (!baseContext) throw new Error("SecureChannel: baseContext is required");
    if (role !== "alice" && role !== "bob") {
      throw new Error('SecureChannel: role must be "alice" or "bob"');
    }

    this._hash = hash;
    this._keyLength = keyLength;
    this._role = role;
    this._baseContext = baseContext;
    this._sharedSecret = toBytes(sharedSecret);

    this._epoch = 0;
    this._sendCounter = 1;
    this._recvCounter = 1;

    this._deriveKeysForEpoch();
  }

  _deriveKeysForEpoch() {
    const epochContext = `${this._baseContext}/epoch-${this._epoch}`;

    const keysAB = deriveSessionKeys({
      sharedSecret: this._sharedSecret,
      context: epochContext + "/alice->bob",
      hash: this._hash,
      keyLength: this._keyLength,
    });

    const keysBA = deriveSessionKeys({
      sharedSecret: this._sharedSecret,
      context: epochContext + "/bob->alice",
      hash: this._hash,
      keyLength: this._keyLength,
    });

    if (this._role === "alice") {
      this._sendKey = keysAB.encKey;
      this._sendNonceBase = keysAB.nonceBase;
      this._recvKey = keysBA.encKey;
      this._recvNonceBase = keysBA.nonceBase;
      this.sessionIdSend = keysAB.sessionId;
      this.sessionIdRecv = keysBA.sessionId;
    } else {
      this._sendKey = keysBA.encKey;
      this._sendNonceBase = keysBA.nonceBase;
      this._recvKey = keysAB.encKey;
      this._recvNonceBase = keysAB.nonceBase;
      this.sessionIdSend = keysBA.sessionId;
      this.sessionIdRecv = keysAB.sessionId;
    }
  }

  /**
   * Rekey the channel: increment epoch and derive fresh keys.
   * Counters are reset to 1.
   */
  rekey() {
    this._epoch += 1;
    this._sendCounter = 1;
    this._recvCounter = 1;
    this._deriveKeysForEpoch();
  }

  /**
   * Encrypt a message to the peer.
   *
   * @param {Uint8Array|Buffer|string} plaintext
   * @param {Uint8Array|Buffer|string} [aad]
   * @returns {{ nonce: Uint8Array, ciphertext: Uint8Array, tag: Uint8Array, counter: number, epoch: number }}
   */
  encryptToPeer(plaintext, aad = null) {
    const pt = toBytes(plaintext);
    const a = toBytes(aad);
    const counter = this._sendCounter++;
    const nonce = makeNonce(this._sendNonceBase, counter);
    const { ciphertext, tag } = encrypt(this._sendKey, nonce, pt, a);
    return { nonce, ciphertext, tag, counter, epoch: this._epoch };
  }

  /**
   * Decrypt a message from the peer.
   *
   * Note: the caller is responsible for ensuring both sides are on the same epoch.
   *
   * @param {Uint8Array|Buffer} nonce
   * @param {Uint8Array|Buffer} ciphertext
   * @param {Uint8Array|Buffer} tag
   * @param {Uint8Array|Buffer|string} [aad]
   * @returns {Uint8Array|null} plaintext or null on auth failure
   */
  decryptFromPeer(nonce, ciphertext, tag, aad = null) {
    const ct = toBytes(ciphertext);
    const t = toBytes(tag);
    const a = toBytes(aad);
    const pt = decrypt(this._recvKey, toBytes(nonce), ct, t, a);
    if (pt !== null) {
      this._recvCounter++;
    }
    return pt;
  }
}

module.exports = {
  SecureChannel,
};