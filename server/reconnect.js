const crypto = require('crypto');
const { state } = require('./state');
const logger = require('./logger');
const CONSTANTS = require('./constants');

function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

function assignToken(roomCode, playerId) {
    const token = generateToken();
    const room = state.rooms[roomCode];
    if (room) {
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.reconnectToken = token;
        }
    }
    return token;
}

function verifyToken(roomCode, playerId, token) {
    const room = state.rooms[roomCode];
    if (!room) return false;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;
    return player.reconnectToken === token;
}

function markPlayerDisconnected(roomCode, playerId, io) {
    const room = state.rooms[roomCode];
    if (room) {
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.connected = false;
            logger.info('Disconnect', `Player ${player.name} disconnected. Starting grace period.`);
            
            // Broadcast state so UI shows disconnected style
            const gameEngine = require('./gameEngine');
            gameEngine.broadcastSanitizedState(io, roomCode);

            // Set grace period timeout
            player.disconnectTimeout = setTimeout(() => {
                const currentRoom = state.rooms[roomCode];
                if (currentRoom) {
                    const currentPlayer = currentRoom.players.find(p => p.id === playerId);
                    if (currentPlayer && !currentPlayer.connected) {
                        logger.info('Disconnect', `Player ${currentPlayer.name} grace period ended. Removing.`);
                        const roomsLogic = require('./rooms');
                        roomsLogic.removePlayer(io, roomCode, playerId);
                    }
                }
            }, CONSTANTS.RECONNECT_GRACE_PERIOD_MS);
        }
    }
}

function restorePlayerConnection(roomCode, playerId, socketId, io) {
    const room = state.rooms[roomCode];
    if (room) {
        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.connected = true;
            if (player.disconnectTimeout) {
                clearTimeout(player.disconnectTimeout);
                player.disconnectTimeout = null;
            }
            logger.info('Reconnect', `Player ${player.name} successfully reconnected.`);
            const gameEngine = require('./gameEngine');
            gameEngine.broadcastSanitizedState(io, roomCode);
            return true;
        }
    }
    return false;
}

module.exports = {
    generateToken,
    assignToken,
    verifyToken,
    markPlayerDisconnected,
    restorePlayerConnection
};
