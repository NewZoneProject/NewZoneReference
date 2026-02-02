// Module: NewZone Health Scanner
// Description: Simple cluster-wide health checker for all microservices.
// Run: node health-scan.js
// File: health-scan.js

const SERVICES = [
    { name: "identity",    url: "http://localhost:3000/health" },
    { name: "metadata",    url: "http://localhost:3001/health" },
    { name: "consensus",   url: "http://localhost:3002/health" },
    { name: "storage",     url: "http://localhost:3003/health" },
    { name: "gateway",     url: "http://localhost:3004/health" },
    { name: "routing",     url: "http://localhost:3005/health" },
    { name: "logging",     url: "http://localhost:3006/health" },
    { name: "monitoring",  url: "http://localhost:3007/health" },
    { name: "event",       url: "http://localhost:3008/health" },
    { name: "directory",   url: "http://localhost:3009/health" },
    { name: "scheduler",   url: "http://localhost:3010/health" },
    { name: "state",       url: "http://localhost:3011/health" },
    { name: "analytics",   url: "http://localhost:3012/health" },
    { name: "queue",       url: "http://localhost:3013/health" },
    { name: "rules",       url: "http://localhost:3014/health" },
    { name: "p2p",         url: "http://localhost:3015/health" },
    { name: "replication", url: "http://localhost:3016/health" }
];

async function check(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return false;
        const json = await res.json();
        return json.status === "ok";
    } catch {
        return false;
    }
}

(async () => {
    console.log("\n=== NewZone Cluster Health ===\n");

    for (const svc of SERVICES) {
        const ok = await check(svc.url);
        const status = ok ? "OK" : "FAIL";
        const color = ok ? "\x1b[32m" : "\x1b[31m";

        console.log(`${color}${status}\x1b[0m  ${svc.name.padEnd(12)}  →  ${svc.url}`);
    }

    console.log("\nScan complete.\n");
})();