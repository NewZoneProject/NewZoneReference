// Module: Storage Microservice Integration Test
// Description: Direct tests for the Storage service (KV + CAS + crypto-routing soft-mode).
// Run: node --test tests/tests_services/storage.test.js
// File: storage.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (Android/Termux safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.storage}`;

// ============================================================
// HEALTH
// ============================================================

test("storage: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

// ============================================================
// KV MODE
// ============================================================

test("storage: KV set", async () => {
    const key = "kv_test_" + Math.random().toString(36).slice(2);
    const value = "v_" + Date.now();

    const res = await fetch(`${BASE}/kv/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.key, key);
    assert.equal(json.value, value);
});

test("storage: KV get", async () => {
    const key = "kv_test_" + Math.random().toString(36).slice(2);
    const value = "v_" + Date.now();

    await fetch(`${BASE}/kv/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
    });

    const res = await fetch(`${BASE}/kv/get/${key}`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.key, key);
    assert.equal(json.value, value);
});

test("storage: KV missing key → 404", async () => {
    const res = await fetch(`${BASE}/kv/get/does_not_exist_${Date.now()}`);
    assert.equal(res.status, 404);
});

// ============================================================
// CAS MODE
// ============================================================

test("storage: CAS store", async () => {
    const obj = { a: 1, ts: Date.now() };

    const res = await fetch(`${BASE}/cas/store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.hash_id);
});

test("storage: CAS get", async () => {
    const obj = { a: 1, ts: Date.now() };

    const res1 = await fetch(`${BASE}/cas/store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj)
    });

    const { hash_id } = await res1.json();

    const res2 = await fetch(`${BASE}/cas/get/${hash_id}`);
    assert.equal(res2.status, 200);

    const json = await res2.json();
    assert.deepEqual(json, obj);
});

test("storage: CAS missing hash → 404", async () => {
    const res = await fetch(`${BASE}/cas/get/does_not_exist_${Date.now()}`);
    assert.equal(res.status, 404);
});

test("storage: CAS verify OK", async () => {
    const obj = { x: 123, ts: Date.now() };

    const res1 = await fetch(`${BASE}/cas/store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj)
    });

    const { hash_id } = await res1.json();

    const res2 = await fetch(`${BASE}/cas/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object: obj, hash_id })
    });

    assert.equal(res2.status, 200);

    const json = await res2.json();
    assert.equal(json.ok, true);
});

test("storage: CAS verify FAIL", async () => {
    const obj = { x: 123, ts: Date.now() };

    const res1 = await fetch(`${BASE}/cas/store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj)
    });

    const { hash_id } = await res1.json();

    const mutated = { ...obj, hacked: true };

    const res2 = await fetch(`${BASE}/cas/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object: mutated, hash_id })
    });

    assert.equal(res2.status, 200);

    const json = await res2.json();
    assert.equal(json.ok, false);
});