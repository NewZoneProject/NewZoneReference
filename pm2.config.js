// Module: PM2 Cluster Configuration
// Description: Launches all NewZone microservices via PM2 on fixed ports.
// Run: pm2 start pm2.config.js
// File: pm2.config.js

module.exports = {
    apps: [
        { name: "identity",    script: "services/identity/server.js" },
        { name: "metadata",    script: "services/metadata/server.js" },
        { name: "consensus",   script: "services/consensus/server.js" },
        { name: "storage",     script: "services/storage/server.js" },
        { name: "gateway",     script: "services/gateway/server.js" },
        { name: "routing",     script: "services/routing/server.js" },
        { name: "logging",     script: "services/logging/server.js" },
        { name: "monitoring",  script: "services/monitoring/server.js" },
        { name: "analytics",   script: "services/analytics/server.js" },
        { name: "directory",   script: "services/directory/server.js" },
        { name: "scheduler",   script: "services/scheduler/server.js" },
        { name: "state",       script: "services/state/server.js" },
        { name: "queue",       script: "services/queue/server.js" },
        { name: "rules",       script: "services/rules/server.js" },
        { name: "p2p",         script: "services/p2p/server.js" },
        { name: "replication", script: "services/replication/server.js" }
    ]
};