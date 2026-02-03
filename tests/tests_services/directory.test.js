// Module: Directory Microservice Integration Test
// Description: Integration test for the Directory service of NewZoneReference.
// Run: node --test tests/tests_services/directory.test.js
// File: directory.test.js

import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve ports.js reliably (works on Android/Termux, any cwd)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORTS = await import(path.resolve(__dirname, "../../config/ports.js"))
    .then(m => m.PORTS);

const BASE = `http://localhost:${PORTS.directory}`;

test("directory: health", async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, "ok");
});

test("directory: list services", async () => {
    const res = await fetch(`${BASE}/services`);
    assert.equal(res.status, 200);

    const json = await res.json();

    // Directory должен вернуть объект с сервисами
    assert.ok(typeof json === "object");
    assert.ok(Object.keys(json).length > 0);

    // Проверяем, что хотя бы один сервис присутствует
    assert.ok(json.identity);
});