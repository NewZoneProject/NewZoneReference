module.exports = {
    apps: [
        { name: "identity",    script: "services/identity/index.js" },
        { name: "metadata",    script: "services/metadata/index.js" },
        { name: "consensus",   script: "services/consensus/index.js" },
        { name: "storage",     script: "services/storage/index.js" },
        { name: "gateway",     script: "services/gateway/index.js" },
        { name: "routing",     script: "services/routing/index.js" },
        { name: "logging",     script: "services/logging/index.js" },
        { name: "monitoring",  script: "services/monitoring/index.js" },
        { name: "analytics",   script: "services/analytics/index.js" },
        { name: "directory",   script: "services/directory/index.js" },
        { name: "scheduler",   script: "services/scheduler/index.js" },
        { name: "state",       script: "services/state/index.js" },
        { name: "queue",       script: "services/queue/index.js" },
        { name: "rules",       script: "services/rules/index.js" },
        { name: "p2p",         script: "services/p2p/index.js" },
        { name: "replication", script: "services/replication/index.js" }
    ]
};