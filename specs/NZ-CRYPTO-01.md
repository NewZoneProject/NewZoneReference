# NZ-CRYPTO-01 — NewZone Cryptographic Layer

## 1. Purpose

NZ-CRYPTO-01 defines a unified cryptographic layer for all NewZone microservices and nodes.

Goals:

- **Unified:** one crypto protocol for all services.
- **Minimal:** small, portable, dependency-light.
- **Modern:** Ed25519, X25519, HKDF, AEAD.
- **JSON-native:** easy to log, debug, and extend.
- **Versioned:** explicit `version` field for forward compatibility.

---

## 2. Algorithms

### 2.1 Signatures

- **Algorithm:** Ed25519  
- **Purpose:** authenticate the sender node, protect against tampering.  
- **Usage:** `auth.signature`.

### 2.2 Key exchange

- **Algorithm:** X25519 (Curve25519 ECDH)  
- **Purpose:** derive a shared secret between two nodes.  
- **Usage:** session key derivation for symmetric encryption.

### 2.3 Symmetric encryption

- **Algorithms (options):**
  - `aes-256-gcm` (default in reference implementation)
  - `chacha20-poly1305` (allowed by spec, optional)
- **Mode:** AEAD (authenticated encryption with associated data).  
- **Purpose:** encrypt `{ auth, body }` packets between nodes.

### 2.4 Hashing

- **Algorithm:** SHA-256  
- **Purpose:** `body_hash`, identifiers, integrity checks.

---

## 3. Signed packet format

Base (not yet encrypted) packet:

```json
{
  "auth": {
    "node_id": "nzid:node:...",
    "timestamp": 1738249200,
    "nonce": "random-128-bit-string",
    "body_hash": "sha256(body)",
    "signature": "base64(ed25519_signature)"
  },
  "body": {
    "action": "update_state",
    "payload": { "...": "..." }
  }
}
```

### 3.1 auth fields

- **node_id** — node identifier (NZ-ID-01, e.g. `nzid:node:<fingerprint>``).
- **timestamp** — UNIX time (seconds) when the packet was created.
- **nonce** — random string, unique per (node_id, timestamp); used for replay protection.
- **body_hash** — `hex(sha256(body))`, where body is the JSON object.
- **signature** — `base64(Ed25519(signature_bytes))`.

### 3.2 Signature calculation

#### 1. Build authwithoutsignature:

```json
{
  "node_id": "...",
  "timestamp": 1738249200,
  "nonce": "random-128-bit-string",
  "body_hash": "..."
}
```

#### 2. Canonicalize authwithoutsignature:
   - sort keys lexicographically,
   - serialize to JSON without extra fields.

#### 3. Compute:

\[
auth\hash = sha256(canonical\auth\_json)
\]

#### 4. Sign:

\[
signature = Ed25519\Sign(auth\hash, ed25519\private\key)
\]

#### 5. Encode signature as Base64 and store in auth.signature.

---

## 4. Encrypted packet format

After signing, the entire `{ auth, body }` object MAY be encrypted.

Encrypted packet:

```json
{
  "version": "nz-crypto-01",
  "cipher": "aes-256-gcm",
  "sendernodeid": "nzid:node:...",
  "receivernodeid": "nzid:node:...",
  "iv": "base64(iv_bytes)",
  "ciphertext": "base64(ciphertext_bytes)"
}
```

### 4.1 Fields

- version — crypto layer version, MUST be "nz-crypto-01" for this spec.
- cipher — encryption algorithm ("aes-256-gcm" or "chacha20-poly1305").
- sendernodeid — sender node ID.
- receivernodeid — receiver node ID.
- iv — initialization vector / nonce (96 bits for AES-GCM; for ChaCha20-Poly1305, 96/128 bits).
- ciphertext — encrypted JSON of the original `{ auth, body }`.

---

## 5. Session key establishment

### 5.1 Node keys

Each node MUST have:

- `ed25519public`, `ed25519private` — for signatures.
- `x25519public`, `x25519private` — for key exchange.

### 5.2 Shared secret

For nodes A and B:

\[
shared\secret\A = X25519(A\priv, B\pub)
\]
\[
shared\secret\B = X25519(B\priv, A\pub)
\]

Both values MUST be equal.

### 5.3 Session key derivation

Use HKDF-SHA256:

\[
session\key = HKDF(shared\secret, info = "nz-session", length = 32)
\]

- session_key — 32 bytes.
- Used as symmetric key for AEAD (`AES-GCM` or `ChaCha20-Poly1305`).

---

## 6. Sending a request

1. Build body (JSON object).
2. Compute body_hash = sha256(body).
3. Build authwithoutsignature:
   - nodeid, timestamp, nonce, bodyhash.
4. Canonicalize authwithoutsignature and compute authhash = sha256(canonicalauth).
5. Sign auth_hash with Ed25519 private key → signature.
6. Build { auth, body }.
7. Optionally encrypt { auth, body } using:
   - session_key (from X25519 + HKDF),
   - chosen cipher.
8. Send either:
   - plain { auth, body } (if encryption is not required), or
   - encrypted packet { version, cipher, sendernodeid, receivernodeid, iv, ciphertext }.

---

## 7. Receiving a request

### 7.1 If packet is encrypted

1. Verify version == "nz-crypto-01".
2. Verify cipher is supported.
3. Read sendernodeid, receivernodeid.
4. Obtain sender’s X25519 public key and receiver’s X25519 private key.
5. Derive shared secret and session_key via HKDF.
6. Decrypt ciphertext using session_key and iv.
7. Parse decrypted JSON as { auth, body }.

### 7.2 Signature and integrity verification

1. Ensure auth and body are present.
2. Validate presence of nodeid, timestamp, nonce, bodyhash, signature.
3. Check timestamp is within allowed skew window (e.g. ±300 seconds).
4. Check nonce has not been seen before for this node_id (replay protection).
5. Compute realbodyhash = sha256(body) and compare with auth.body_hash.
6. Build authwithoutsignature, canonicalize, compute authhash = sha256(canonicalauth).
7. Obtain Ed25519 public key for auth.node_id.
8. Verify signature over auth_hash using Ed25519.
9. If all checks pass, the packet is valid and body MAY be processed.

---

## 8. Implementation requirements

- All microservices MUST use a shared crypto module (lib/nz-crypto.js).
- Crypto primitives MUST be provided by an adapter (lib/nz-crypto-adapter-noble.js).
- Node keys SHOULD be stored in keys/node.json or managed by Identity service.
- Public keys of other nodes MUST be discoverable via:
  - static configuration,
  - Identity service,
  - P2P discovery.

All new inter-service protocols MUST:

- either use `{ auth, body }`` with signatures,
- or use the encrypted format wrapping `{ auth, body }``.

---

## 9. Versioning

- **version:** "nz-crypto-01" — current version.
- **Future versions MUST increment:**
  - "nz-crypto-02", "nz-crypto-03", etc.
- **Microservices MUST:**
  - reject unknown versions,
  - MAY support multiple versions during migration.
