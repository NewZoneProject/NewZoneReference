// Module: Discovery Microservice Core
// Description: UDP broadcast + listener for service discovery.
// File: index.js

const dgram = require("dgram");
const os = require("os");

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "127.0.0.1";
}

function createDiscoverySocket(port, onMessage) {
    const socket = dgram.createSocket("udp4");

    socket.on("message", (msg) => {
        try {
            const data = JSON.parse(msg.toString());
            onMessage(data);
        } catch {
            // ignore malformed packets
        }
    });

    socket.bind(port, () => {
        socket.setBroadcast(true);
    });

    return socket;
}

function broadcast(socket, port, payload) {
    const message = Buffer.from(JSON.stringify(payload));
    socket.send(message, 0, message.length, port, "255.255.255.255");
}

module.exports = {
    getLocalIP,
    createDiscoverySocket,
    broadcast
};