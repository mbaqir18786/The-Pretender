const { state } = require('./state');
const rooms = require('./rooms');
const reconnect = require('./reconnect');
const gameEngine = require('./gameEngine');
const chat = require('./chat');
const voting = require('./voting');
const logger = require('./logger');

const socketEventThrottle = {};

function throttle(socketId, eventName, limitMs) {
    const key = `${socketId}_${eventName}`;
    const now = Date.now();
    if (socketEventThrottle[key] && now - socketEventThrottle[key] < limitMs) {
        return true; // Throttled
    }
    socketEventThrottle[key] = now;
    return false;
}

function initSocket(io) {
    io.on('connection', (socket) => {
        logger.info('Connection', `Socket connected: ${socket.id}`);

        socket.on('CREATE_ROOM', (data, callback) => {
            if (throttle(socket.id, 'CREATE_ROOM', 1000)) return callback({ error: 'Too fast' });
            const { playerName, playerId } = data;
            const res = rooms.createRoom(io, playerId, playerName, socket.id);
            if (res.success) {
                socket.join(res.roomCode);
            }
            callback(res);
        });

        socket.on('JOIN_ROOM', (data, callback) => {
            if (throttle(socket.id, 'JOIN_ROOM', 1000)) return callback({ error: 'Too fast' });
            const { roomCode, playerName, playerId } = data;
            const res = rooms.joinRoom(io, roomCode, playerId, playerName, socket.id);
            if (res.success) {
                socket.join(roomCode);
            }
            callback(res);
        });

        socket.on('RECONNECT', (data, callback) => {
            if (throttle(socket.id, 'RECONNECT', 1000)) return callback({ error: 'Too fast' });
            const { roomCode, playerId, token } = data;
            if (reconnect.verifyToken(roomCode, playerId, token)) {
                if (reconnect.restorePlayerConnection(roomCode, playerId, socket.id, io)) {
                    state.socketMap[socket.id] = { playerId, roomCode };
                    socket.join(roomCode);
                    return callback({ success: true, roomCode });
                }
            }
            callback({ error: 'Invalid reconnect token or room expired' });
        });

        socket.on('LEAVE_ROOM', (data, callback) => {
            const { roomCode, playerId } = data;
            rooms.removePlayer(io, roomCode, playerId);
            socket.leave(roomCode);
            delete state.socketMap[socket.id];
            if (callback) callback({ success: true });
        });

        socket.on('READY_UP', (data, callback) => {
            if (throttle(socket.id, 'READY_UP', 500)) return callback({ error: 'Too fast' });
            const { roomCode, playerId } = data;
            const res = gameEngine.processReady(io, roomCode, playerId);
            callback(res);
        });

        socket.on('START_GAME', (data, callback) => {
            if (throttle(socket.id, 'START_GAME', 2000)) return callback({ error: 'Too fast' });
            const { roomCode, playerId } = data;
            const res = gameEngine.startGame(io, roomCode, playerId);
            callback(res);
        });

        socket.on('CAST_VOTE', (data, callback) => {
            if (throttle(socket.id, 'CAST_VOTE', 500)) return callback({ error: 'Too fast' });
            const { roomCode, voterId, targetId } = data;
            const res = voting.processVote(io, roomCode, voterId, targetId);
            callback(res);
        });

        socket.on('SEND_CHAT', (data, callback) => {
            const { roomCode, playerId, message } = data;
            const res = chat.sendChatMessage(io, roomCode, playerId, message);
            callback(res);
        });

        socket.on('disconnect', () => {
            const info = state.socketMap[socket.id];
            if (info) {
                const { roomCode, playerId } = info;
                reconnect.markPlayerDisconnected(roomCode, playerId, io);
                delete state.socketMap[socket.id];
            }
            logger.info('Connection', `Socket disconnected: ${socket.id}`);
        });
    });
}

module.exports = {
    initSocket
};
