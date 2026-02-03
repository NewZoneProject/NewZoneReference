// Module: Storage Flow Test (Hybrid KV + CAS, Extended)
// Description: Full validation suite for KV + CAS storage through gateway → routing → storage.
// Run: node --test tests/integration/storage_flow.test.js
// File: storage_flow.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function gw(path, method, body) {
    const res = await fetch(`http://localhost:${PORTS.gateway}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            service: "storage",
            path,
            method,
            body
        })
    });
    return res;
}

// ============================================================
// 1. KV MODE TESTS
// ============================================================

test("KV: write", async () => {
    const key = "kv_key_" + Date.now();
    const value = "kv_value_" + Math.random().toString(36).slice(2);

    globalThis.KV_TEST = { key, value };

    const res = await gw("/kv/set", "POST", { key, value });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.key, key);
    assert.equal(json.value, value);
});

test("KV: read", async () => {
    await sleep(50);

    const { key, value } = globalThis.KV_TEST;

    const res = await gw(`/kv/get/${key}`, "GET");
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.value, value);
});

test("KV: overwrite", async () => {
    const key = "kv_overwrite_" + Date.now();
    const v1 = "first_" + Math.random().toString(36).slice(2);
    const v2 = "second_" + Math.random().toString(36).slice(2);

    await gw("/kv/set", "POST", { key, value: v1 });
    await gw("/kv/set", "POST", { key, value: v2 });

    const res = await gw(`/kv/get/${key}`, "GET");
    const json = await res.json();
    assert.equal(json.value, v2);
});

test("KV: missing key returns 404", async () => {
    const res = await gw(`/kv/get/does_not_exist_${Date.now()}`, "GET");
    assert.equal(res.status, 404);
});

// ============================================================
// 2. CAS MODE TESTS
// ============================================================

test("CAS: store", async () => {
    const object = {
        type: "cas_test",
        ts: Date.now(),
        value: "cas_value_" + Math.random().toString(36).slice(2)
    };

    globalThis.CAS_OBJECT = object;

    const res = await gw("/cas/store", "POST", object);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.hash_id);

    globalThis.CAS_HASH = json.hash_id;
});

test("CAS: get", async () => {
    await sleep(50);

    const hash = globalThis.CAS_HASH;
    const original = globalThis.CAS_OBJECT;

    const res = await gw(`/cas/get/${hash}`, "GET");
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.deepEqual(json, original);
});

test("CAS: verify OK", async () => {
    const hash = globalThis.CAS_HASH;
    const object = globalThis.CAS_OBJECT;

    const res = await fetch(`http://localhost:${PORTS.storage}/cas/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object, hash_id: hash })
    });

    const json = await res.json();
    assert.equal(json.ok, true);
});

test("CAS: verify FAIL on mutation", async () => {
    const hash = globalThis.CAS_HASH;
    const original = globalThis.CAS_OBJECT;

    const mutated = { ...original, hacked: true };

    const res = await fetch(`http://localhost:${PORTS.storage}/cas/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object: mutated, hash_id: hash })
    });

    const json = await res.json();
    assert.equal(json.ok, false);
});

test("CAS: missing hash returns 404", async () => {
    const res = await gw(`/cas/get/does_not_exist_${Date.now()}`, "GET");
    assert.equal(res.status, 404);
});

test("CAS: deterministic hashing", async () => {
    const obj = { a: 1, b: 2 };

    const r1 = await gw("/cas/store", "POST", obj);
    const r2 = await gw("/cas/store", "POST", obj);

    const h1 = (await r1.json()).hash_id;
    const h2 = (await r2.json()).hash_id;

    assert.equal(h1, h2);
});

test("CAS: uniqueness for different objects", async () => {
    const o1 = { x: 1 };
    const o2 = { x: 2 };

    const h1 = (await (await gw("/cas/store", "POST", o1)).json()).hash_id;
    const h2 = (await (await gw("/cas/store", "POST", o2)).json()).hash_id;

    assert.notEqual(h1, h2);
});

test("CAS: deduplication (same hash returns same object)", async () => {
    const obj = { foo: "bar" };

    const h1 = (await (await gw("/cas/store", "POST", obj)).json()).hash_id;
    const h2 = (await (await gw("/cas/store", "POST", obj)).json()).hash_id;

    assert.equal(h1, h2);

    const r = await gw(`/cas/get/${h1}`, "GET");
    const json = await r.json();

    assert.deepEqual(json, obj);
});

// ============================================================
// 3. BULK TESTS
// ============================================================

test("KV: bulk 1000 writes", async () => {
    for (let i = 0; i < 1000; i++) {
        const key = "kv_bulk_" + i + "_" + Date.now();
        const value = "v_" + Math.random().toString(36).slice(2);

        const res = await gw("/kv/set", "POST", { key, value });
        assert.equal(res.status, 200);
    }
});

test("CAS: bulk 1000 stores", async () => {
    for (let i = 0; i < 1000; i++) {
        const obj = { n: i, ts: Date.now() };

        const res = await gw("/cas/store", "POST", obj);
        assert.equal(res.status, 200);

        const json = await res.json();
        assert.ok(json.hash_id);
    }
});

// ============================================================
// 4. PARALLEL TESTS
// ============================================================

test("KV: 50 parallel writes", async () => {
    const tasks = [];

    for (let i = 0; i < 50; i++) {
        const key = "kv_parallel_" + i + "_" + Date.now();
        const value = "v_" + Math.random().toString(36).slice(2);

        tasks.push(gw("/kv/set", "POST", { key, value }));
    }

    const results = await Promise.all(tasks);
    results.forEach(r => assert.equal(r.status, 200));
});

test("CAS: 50 parallel stores", async () => {
    const tasks = [];

    for (let i = 0; i < 50; i++) {
        const obj = { i, ts: Date.now() };
        tasks.push(gw("/cas/store", "POST", obj));
    }

    const results = await Promise.all(tasks);
    results.forEach(r => assert.equal(r.status, 200));
});

// ============================================================
// 5. LARGE OBJECT TEST
// ============================================================

test("CAS: large object (100–300 KB)", async () => {
    const size = 100_000 + Math.floor(Math.random() * 200_000);
    const big = "x".repeat(size);

    const obj = { big, ts: Date.now() };

    const res = await gw("/cas/store", "POST", obj);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.ok(json.hash_id);

    const res2 = await gw(`/cas/get/${json.hash_id}`, "GET");
    const obj2 = await res2.json();

    assert.equal(obj2.big.length, size);
});

// ============================================================
// 6. HEALTHCHECK
// ============================================================

test("storage: direct /health", async () => {
    const res = await fetch(`http://localhost:${PORTS.storage}/health`);
    assert.equal(res.status, 200);
});