const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const logger = require('./server/logger');
const { loadState } = require('./server/state');
const socketHandler = require('./server/socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Init game state and sockets
loadState();
socketHandler.initSocket(io);

// Start Server
server.listen(PORT, () => {
    logger.info('Server', `Server is running on http://localhost:${PORT}`);
});