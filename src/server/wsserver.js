const WebSocket = require('ws');

// Create a WebSocket server instance
const wss = new WebSocket.Server({ port: 8080 });

// Event handler for when a client connects
wss.on('connection', function connection(ws) {
  console.log('A client connected');

  // Event handler for receiving messages from the client
  ws.on('message', function incoming(message) {
    console.log('Received:', message);
  });

  // Event handler for when the client closes the connection
  ws.on('close', function close() {
    console.log('Client disconnected');
  });
});

console.log('WebSocket server is running on port 8080');
