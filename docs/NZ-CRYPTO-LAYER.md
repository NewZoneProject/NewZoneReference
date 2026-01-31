# NZ Crypto Layer

`nz-crypto.js` is the unified cryptographic layer used across all NewZone microservices.  
It defines the **protocol**, not the implementation: signing, verification, encryption,
session key derivation, and deterministic key generation from the NewZone seed standard.

This module is fully portable, dependency‑free, and works in browsers, mobile runtimes,
and minimal JS environments. Actual cryptographic primitives (Ed25519, X25519) are
provided by external adapters.

---

## Features

### 1. Deterministic Identity Root (NZ‑CRYPTO‑SEED‑01)
- 24‑word mnemonic + password → master secret  
- HKDF‑based hierarchical key tree  
- Deterministic keys for:
  - users  
  - nodes  
  - services  
  - objects  
  - sessions  

### 2. Signing & Verification (Ed25519)
- Canonicalized packet signing  
- Replay protection (nonce)  
- Timestamp validation  
- Adapter‑based signature verification  

### 3. Session Key Derivation (X25519 + HKDF)
- ECDH shared secret  
- HKDF‑SHA256 session key  
- Stateless and deterministic  

### 4. Symmetric Encryption
- **AES‑256‑GCM** (WebCrypto)  
- **ChaCha20** (pure JS stream cipher)  
- Base64‑encoded transport format  

### 5. Portable Architecture
- No dependencies  
- No platform assumptions  
- Works with any Ed25519/X25519 implementation  
- Designed for mobile and edge environments  

---

## Architecture

```
nz-crypto.js
 ├── helpers/encoding
 ├── sha256 / hkdf
 ├── seed → master_secret → key tree
 ├── ed25519 (adapter)
 ├── x25519 (adapter)
 ├── AES‑GCM (WebCrypto)
 ├── ChaCha20 (pure JS)
 ├── signed packets
 └── encrypted packets
```

The module defines **protocol behavior**.  
Adapters provide **cryptographic primitives**.

---

## Usage

### 1. Deterministic key derivation

```js
import {
  deriveMasterSecret,
  deriveSeedKey
} from './nz-crypto.js';

const master = await deriveMasterSecret(mnemonic, password);
const userSignKey = await deriveSeedKey(master, 'id:user:oleg:sign');
```

### 2. Signing a packet

```js
const packet = await buildSignedPacket({
  nodeId,
  privateKey,
  body: { hello: 'world' }
});
```

### 3. Verifying a packet

```js
const result = await verifySignedPacket({
  packet,
  getPublicKeyByNodeId
});
```

### 4. Encrypting a packet

```js
const encrypted = await encryptPacket({
  packet,
  sessionKey,
  senderNodeId,
  receiverNodeId
});
```

### 5. Decrypting a packet

```js
const decrypted = await decryptPacket({
  packet: encrypted,
  sessionKey
});
```

---

## Adapter Model

`nzCrypto` exposes abstract interfaces:

```js
nzCrypto.ed25519.sign(msg, priv)
nzCrypto.ed25519.verify(sig, msg, pub)
nzCrypto.x25519.deriveSharedSecret(priv, pub)
```

You can plug in any implementation:

- Noble Ed25519/X25519  
- WebCrypto (when available)  
- Native mobile bindings  
- WASM modules  

Adapters must be small, pure, and deterministic.

---

## Philosophy

This module follows the NewZone principles:

- minimalism  
- determinism  
- portability  
- protocol over implementation  
- zero dependencies  
- long‑term durability  

It is designed to outlive libraries, frameworks, and platforms.

---

## License

MIT (same as the NewZone standard)
