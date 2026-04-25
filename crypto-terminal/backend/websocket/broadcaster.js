const { WebSocketServer } = require("ws");
const { PRICE_EVENT, ALERT_EVENT, MARKET_EVENT } = require("../config/constants");

let wss;

function initializeBroadcaster(server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (socket) => {
    socket.send(
      JSON.stringify({
        type: MARKET_EVENT,
        event: "connected",
        timestamp: new Date().toISOString(),
      })
    );

    socket.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message?.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch (_err) {
        socket.send(JSON.stringify({ type: MARKET_EVENT, event: "invalid_message" }));
      }
    });
  });
}

function broadcast(type, payload) {
  if (!wss) return;
  const message = JSON.stringify({ type, ...payload });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function broadcastPrice(payload) {
  broadcast(PRICE_EVENT, payload);
}

function broadcastAlert(payload) {
  broadcast(ALERT_EVENT, payload);
}

module.exports = {
  initializeBroadcaster,
  broadcast,
  broadcastPrice,
  broadcastAlert,
};
