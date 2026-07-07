const { state } = require('./state');
const logger = require('./logger');
const CONSTANTS = require('./constants');
const reconnect = require('./reconnect');

function generateRoomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
        code = '';
        for (let i = 0; i < CONSTANTS.ROOM_CODE_LENGTH; i++) {
            code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        }
    } while (state.activeCodes.has(code));
    return code;
}

function createRoom(io, playerId, playerName, socketId) {
    const code = generateRoomCode();
    state.activeCodes.add(code);
    
    state.rooms[code] = {
        code: code,
        hostId: playerId,
        gameState: 'lobby',
        timer: 0,
        players: [],
        currentWordPair: null,
        announcement: ''
    };
    
    logger.info('Room', `Room ${code} created by ${playerName}`);
    return joinRoom(io, code, playerId, playerName, socketId);
}

function joinRoom(io, roomCode, playerId, playerName, socketId) {
    const room = state.rooms[roomCode];
    if (!room) {
        return { error: 'Room not found' };
    }
    
    if (room.players.length >= CONSTANTS.MAX_PLAYERS) {
        return { error: 'Room is full' };
    }

    // Check if player already exists
    const existingPlayer = room.players.find(p => p.id === playerId);
    if (existingPlayer) {
        // Handled by reconnect flow instead
        return { error: 'Player already exists in room. Use reconnect.' };
    }

    const newPlayer = {
        id: playerId,
        name: playerName,
        isHost: room.players.length === 0, // First player becomes host
        isReady: false,
        isDead: false,
        vote: null,
        role: 'normal',
        word: '',
        connected: true,
        reconnectToken: ''
    };

    room.players.push(newPlayer);
    
    if (newPlayer.isHost) {
        room.hostId = playerId;
    }

    const token = reconnect.assignToken(roomCode, playerId);
    state.socketMap[socketId] = { playerId, roomCode };
    
    logger.info('Join', `Player ${playerName} joined room ${roomCode}`);
    
    const gameEngine = require('./gameEngine');
    gameEngine.broadcastSanitizedState(io, roomCode);

    return { success: true, roomCode, token };
}

function removePlayer(io, roomCode, playerId) {
    const room = state.rooms[roomCode];
    if (!room) return;

    room.players = room.players.filter(p => p.id !== playerId);
    logger.info('Leave', `Player ${playerId} removed from room ${roomCode}`);

    if (room.players.length === 0) {
        // Delete room if empty
        state.activeCodes.delete(roomCode);
        delete state.rooms[roomCode];
        logger.info('Room', `Room ${roomCode} deleted (empty)`);
        return;
    }

    // Host migration
    if (room.hostId === playerId) {
        const nextHost = room.players.find(p => p.connected);
        if (nextHost) {
            room.hostId = nextHost.id;
            nextHost.isHost = true;
            logger.info('Host', `Host migrated to ${nextHost.name} in room ${roomCode}`);
            const chat = require('./chat');
            chat.sendSystemMessage(io, roomCode, `${nextHost.name} is the new host.`);
        }
    }

    const gameEngine = require('./gameEngine');
    gameEngine.broadcastSanitizedState(io, roomCode);
}

module.exports = {
    createRoom,
    joinRoom,
    removePlayer
};
