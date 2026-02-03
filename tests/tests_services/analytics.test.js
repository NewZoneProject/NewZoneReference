import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.analytics}`;

test("analytics: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("analytics: reject invalid crypto-routing packet", async () => {
    const res = await fetch(`${BASE}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            version: "nz-routing-crypto-01",
            bogus: true
        })
    });

    assert.equal(res.status, 403);
});

test("analytics: allow plain JSON in soft-mode", async () => {
    const entry = {
        type: "metric",
        payload: { cpu: Math.random(), ts: Date.now() }
    };

    const res = await fetch(`${BASE}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry)
    });

    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.type, entry.type);
    assert.deepEqual(json.payload, entry.payload);
});

test("analytics: list records", async () => {
    const res = await fetch(`${BASE}/records`);
    assert.equal(res.status, 200);

    const json = await res.json();

    assert.ok(Array.isArray(json));
    assert.ok(json.length >= 0);
});