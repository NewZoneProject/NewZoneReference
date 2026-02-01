// ============================================================================
// NewZone — unified test entry point
// Run: node --test tests/all.test.js
//
// Tests are grouped from lowest-level primitives → protocols → facade →
// seed system → RFC-grade full-stack tests.
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Core cryptographic primitives (lowest level)
// ---------------------------------------------------------------------------
import "./blake2b.test.js";
import "./chacha20poly1305.test.js";
import "./ed25519.test.js";
import "./x25519.test.js";
import "./hkdf.test.js";

// ---------------------------------------------------------------------------
// 2. Mid-level building blocks (session keys, secure channel)
// ---------------------------------------------------------------------------
import "./sessionKeys.test.js";
import "./secureChannel.test.js";

// ---------------------------------------------------------------------------
// 3. Handshake + facade-level API
// ---------------------------------------------------------------------------
import "./handshake.test.js";
import "./nz-crypto.facade.test.js";
import "./nz-crypto.test.js";

// ---------------------------------------------------------------------------
// 4. Seed system (NZ-CRYPTO-SEED-01)
// ---------------------------------------------------------------------------
import "./seed_rfc.test.js";
import "./wordlist_integrity.test.js";

// ---------------------------------------------------------------------------
// 5. Full-stack RFC-grade facade test suite (NZ-CRYPTO-01)
// ---------------------------------------------------------------------------
import "./nz_crypto_rfc.test.js";