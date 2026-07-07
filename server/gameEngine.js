const fs = require('fs');
const path = require('path');
const { state } = require('./state');
const logger = require('./logger');
const timers = require('./timers');
const CONSTANTS = require('./constants');
const chat = require('./chat');

let wordPairs = [];
try {
    wordPairs = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'wordPairs.json'), 'utf8'));
} catch (err) {
    logger.error('GameEngine', 'Failed to load word pairs', err);
}

function broadcastSanitizedState(io, roomCode) {
    const room = state.rooms[roomCode];
    if (!room) return;

    room.players.forEach(player => {
        const socketInfo = Object.entries(state.socketMap).find(([sid, data]) => data.playerId === player.id && data.roomCode === roomCode);
        if (socketInfo) {
            const sid = socketInfo[0];
            const sanitizedState = {
                gameState: room.gameState,
                timer: room.timer,
                announcement: room.announcement,
                currentWordPair: room.gameState === 'gameover' ? room.currentWordPair : null, // only reveal at end
                players: room.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    isHost: p.isHost,
                    isReady: p.isReady,
                    isDead: p.isDead,
                    vote: p.vote,
                    connected: p.connected,
                    // Cheat prevention: only send role/word if it's the current player OR game is over
                    role: (p.id === player.id || room.gameState === 'gameover') ? p.role : 'hidden',
                    word: (p.id === player.id || room.gameState === 'gameover') ? p.word : 'hidden'
                }))
            };
            io.to(sid).emit('UPDATE_ROOM_STATE', sanitizedState);
        }
    });
}

function startGame(io, roomCode, playerId) {
    const room = state.rooms[roomCode];
    if (!room) return { error: 'Room not found' };
    if (room.hostId !== playerId) return { error: 'Only host can start the game' };
    if (room.players.length < CONSTANTS.MIN_PLAYERS) return { error: `Need at least ${CONSTANTS.MIN_PLAYERS} players` };

    room.gameState = 'reveal';
    room.announcement = '';

    const wordPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    room.currentWordPair = wordPair;

    const totalPlayers = room.players.length;
    let pretenderCount = 1;
    if (totalPlayers >= 6 && totalPlayers <= 10) pretenderCount = 2;
    else if (totalPlayers >= 11 && totalPlayers <= 15) pretenderCount = 3;
    else if (totalPlayers >= 16) pretenderCount = 4;

    const indices = [...Array(totalPlayers).keys()];
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const pretenderIndices = indices.slice(0, pretenderCount);

    room.players.forEach((p, idx) => {
        p.isReady = false;
        p.isDead = false;
        p.vote = null;
        if (pretenderIndices.includes(idx)) {
            p.role = 'pretender';
            p.word = wordPair.pretender;
        } else {
            p.role = 'normal';
            p.word = wordPair.normal;
        }
    });

    logger.info('Game', `Game started in room ${roomCode}`);
    
    timers.startTimer(io, roomCode, 30, () => {
        startDiscussionRound(io, roomCode);
    });

    broadcastSanitizedState(io, roomCode);
    return { success: true };
}

function processReady(io, roomCode, playerId) {
    const room = state.rooms[roomCode];
    if (!room) return { error: 'Room not found' };
    if (room.gameState !== 'reveal') return { error: 'Not in reveal phase' };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { error: 'Player not found' };

    player.isReady = true;
    chat.sendSystemMessage(io, roomCode, `${player.name} is ready.`);

    const activePlayers = room.players.filter(p => !p.isDead && p.connected);
    const allReady = activePlayers.every(p => p.isReady);

    if (allReady) {
        startDiscussionRound(io, roomCode);
    } else {
        broadcastSanitizedState(io, roomCode);
    }
    return { success: true };
}

function startDiscussionRound(io, roomCode) {
    const room = state.rooms[roomCode];
    if (!room) return;

    room.gameState = 'discuss';
    chat.sendSystemMessage(io, roomCode, `Discussion round started! Speak freely.`);

    logger.info('Game', `Discussion started in room ${roomCode}`);

    timers.startTimer(io, roomCode, CONSTANTS.DISCUSSION_TIME, () => {
        const voting = require('./voting');
        voting.startVotingRound(io, roomCode);
    });

    broadcastSanitizedState(io, roomCode);
}

function checkWinConditions(io, roomCode) {
    const room = state.rooms[roomCode];
    if (!room) return;

    const alivePlayers = room.players.filter(p => !p.isDead);
    const pretendersAlive = alivePlayers.filter(p => p.role === 'pretender');
    const normalsAlive = alivePlayers.filter(p => p.role === 'normal');

    if (pretendersAlive.length === 0) {
        endGame(io, roomCode, 'normals');
    } else if (pretendersAlive.length >= normalsAlive.length) {
        endGame(io, roomCode, 'pretenders');
    } else {
        // Next round
        room.gameState = 'reveal';
        room.players.forEach(p => {
            p.isReady = false;
            p.vote = null;
        });

        logger.info('Game', `Proceeding to next round in room ${roomCode}`);
        timers.startTimer(io, roomCode, 30, () => {
            startDiscussionRound(io, roomCode);
        });

        broadcastSanitizedState(io, roomCode);
    }
}

function endGame(io, roomCode, winnerSide) {
    const room = state.rooms[roomCode];
    if (!room) return;

    room.gameState = 'gameover';
    timers.clearRoomTimer(roomCode);

    room.announcement = winnerSide === 'normals' ? "NORMAL PLAYERS WIN!" : "THE PRETENDER(S) WON!";
    logger.info('Game', `Game over in room ${roomCode}. Winner: ${winnerSide}`);

    broadcastSanitizedState(io, roomCode);
}

module.exports = {
    broadcastSanitizedState,
    startGame,
    processReady,
    startDiscussionRound,
    checkWinConditions,
    endGame
};
