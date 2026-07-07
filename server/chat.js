const { state } = require('./state');
const validators = require('./validators');
const logger = require('./logger');
const CONSTANTS = require('./constants');

const chatCooldowns = {}; // playerId -> timestamp

function sendChatMessage(io, roomCode, playerId, rawMessage) {
    const room = state.rooms[roomCode];
    if (!room) return { error: 'Room not found' };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { error: 'Player not found' };

    if (player.isDead) return { error: 'Dead players cannot chat' };

    const now = Date.now();
    const lastChatTime = chatCooldowns[playerId] || 0;
    if (now - lastChatTime < CONSTANTS.CHAT_COOLDOWN_MS) {
        return { error: 'Chat cooldown active. Slow down!' };
    }
    chatCooldowns[playerId] = now;

    const message = validators.sanitizeText(rawMessage, CONSTANTS.MAX_CHAT_LENGTH);
    if (!message) return { error: 'Empty message' };

    logger.info('Chat', `[${roomCode}] ${player.name}: ${message}`);

    io.to(roomCode).emit('CHAT_MESSAGE', {
        senderName: player.name,
        message: message,
        isSystem: false
    });

    return { success: true };
}

function sendSystemMessage(io, roomCode, message) {
    io.to(roomCode).emit('CHAT_MESSAGE', {
        senderName: 'SYSTEM',
        message: message,
        isSystem: true
    });
}

module.exports = {
    sendChatMessage,
    sendSystemMessage
};
