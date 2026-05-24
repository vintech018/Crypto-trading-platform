// backend/src/services/realtime/websocket.service.js
import { WebSocketServer } from 'ws';

let wss = null;

export const initWebSocketServer = (server) => {
  wss = new WebSocketServer({ server, path: '/api/realtime/stream' });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected to intelligence stream');
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Welcome to NexusIntel Real-Time Stream' }));
    
    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
    });
  });
  
  console.log('[WebSocket] Server initialized on /api/realtime/stream');
};

export const broadcast = (type, payload) => {
  if (!wss) return;
  const message = JSON.stringify({ type, data: payload, timestamp: Date.now() });
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
};
