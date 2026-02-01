// ============================================================================
// NewZone — unified test entry point
// Run: node --test tests/all.test.js
//
// This file simply imports all other test modules so that the Node.js
// test runner discovers and executes them in a single pass.
// ============================================================================

// Core primitives
import "./blake2b.test.js";
import "./chacha20poly1305.test.js";
import "./ed25519.test.js";
import "./x25519.test.js";
import "./hkdf.test.js";

// Session + SecureChannel
import "./sessionKeys.test.js";
import "./secureChannel.test.js";

// Handshake + facade
import "./handshake.test.js";
import "./nz-crypto.facade.test.js";
import "./nz-crypto.test.js";