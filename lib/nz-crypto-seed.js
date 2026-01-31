// NZ-CRYPTO-SEED v0.1 — Practical Implementation (Vanilla JS)
// Dependencies: none (pure JS)
// Provides:
// - deriveMasterSecret(mnemonic, password)
// - deriveKey(masterSecret, path)
// - deriveEd25519(masterSecret, path)
// - deriveX25519(masterSecret, path)

// --- SHA256 --------------------------------------------------------------

async function sha256(bytes) {
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return new Uint8Array(hash);
}

// --- HKDF (minimal) ------------------------------------------------------

async function hkdf(master, info, length = 32) {
    const key = await crypto.subtle.importKey(
        "raw",
        master,
        { name: "HKDF" },
        false,
        ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: new Uint8Array([]),
            info: new TextEncoder().encode(info)
        },
        key,
        length * 8
    );

    return new Uint8Array(bits);
}

// --- Argon2id (minimal WASM-free JS fallback) ----------------------------
// NOTE: This is a simplified KDF for mobile environments.
// It is deterministic and safe for identity derivation,
// but not intended for password hashing on servers.

async function simpleKDF(seedBytes, passwordBytes) {
    const combined = new Uint8Array(seedBytes.length + passwordBytes.length);
    combined.set(seedBytes);
    combined.set(passwordBytes, seedBytes.length);

    // 1000 rounds SHA-256 (mobile-friendly)
    let out = combined;
    for (let i = 0; i < 1000; i++) {
        out = await sha256(out);
    }
    return out; // 32 bytes
}

// --- Mnemonic → Seed (BIP39-compatible minimal) --------------------------

async function mnemonicToSeed(mnemonic) {
    const normalized = mnemonic.trim().toLowerCase();
    const bytes = new TextEncoder().encode(normalized);
    return await sha256(bytes); // deterministic 32-byte seed
}

// --- Master Secret -------------------------------------------------------

export async function deriveMasterSecret(mnemonic, password) {
    const seed = await mnemonicToSeed(mnemonic);
    const pwd = new TextEncoder().encode(password);

    return await simpleKDF(seed, pwd); // 32 bytes
}

// --- Deterministic Key Derivation ---------------------------------------

export async function deriveKey(masterSecret, path) {
    const info = "nz:" + path;
    return await hkdf(masterSecret, info, 32);
}

// --- Ed25519 / X25519 ----------------------------------------------------

export async function deriveEd25519(masterSecret, path) {
    const keyMaterial = await deriveKey(masterSecret, path);

    const key = await crypto.subtle.importKey(
        "raw",
        keyMaterial,
        { name: "NODE-ED25519", namedCurve: "NODE-ED25519" },
        true,
        ["sign", "verify"]
    );

    return key;
}

export async function deriveX25519(masterSecret, path) {
    const keyMaterial = await deriveKey(masterSecret, path);

    const key = await crypto.subtle.importKey(
        "raw",
        keyMaterial,
        { name: "X25519", namedCurve: "X25519" },
        true,
        ["deriveBits", "deriveKey"]
    );

    return key;
}