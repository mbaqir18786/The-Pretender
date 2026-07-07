const { state } = require('./state');
const logger = require('./logger');
const timers = require('./timers');
const chat = require('./chat');
const CONSTANTS = require('./constants');

function startVotingRound(io, roomCode) {
    const room = state.rooms[roomCode];
    if (!room) return;

    room.gameState = 'vote';
    room.players.forEach(p => p.vote = null);

    chat.sendSystemMessage(io, roomCode, `Voting time! Cast your vote for the Pretender.`);
    logger.info('Game', `Voting started in room ${roomCode}`);

    timers.startTimer(io, roomCode, CONSTANTS.VOTING_TIME, () => {
        evaluateVotes(io, roomCode);
    });

    const gameEngine = require('./gameEngine');
    gameEngine.broadcastSanitizedState(io, roomCode);
}

function processVote(io, roomCode, voterId, targetId) {
    const room = state.rooms[roomCode];
    if (!room) return { error: 'Room not found' };
    if (room.gameState !== 'vote') return { error: 'Not in voting phase' };

    const voter = room.players.find(p => p.id === voterId);
    if (!voter) return { error: 'Voter not found' };
    if (voter.isDead) return { error: 'Dead players cannot vote' };
    if (!voter.connected) return { error: 'Disconnected players cannot vote' };

    const target = room.players.find(p => p.id === targetId);
    if (!target) return { error: 'Target not found' };
    if (voterId === targetId) return { error: 'Cannot vote for yourself' };

    voter.vote = targetId;

    const activePlayers = room.players.filter(p => !p.isDead && p.connected);
    const allVoted = activePlayers.every(p => p.vote !== null);

    logger.info('Vote', `Player ${voter.name} voted for ${target.name} in room ${roomCode}`);

    if (allVoted) {
        evaluateVotes(io, roomCode);
    } else {
        const gameEngine = require('./gameEngine');
        gameEngine.broadcastSanitizedState(io, roomCode);
    }
    return { success: true };
}

function evaluateVotes(io, roomCode) {
    const room = state.rooms[roomCode];
    if (!room) return;

    timers.clearRoomTimer(roomCode);
    room.gameState = 'results';

    const voteCounts = {};
    const activePlayers = room.players.filter(p => !p.isDead && p.connected);
    
    activePlayers.forEach(p => {
        if (p.vote) {
            voteCounts[p.vote] = (voteCounts[p.vote] || 0) + 1;
        }
    });

    let maxVotes = 0;
    let eliminatedId = null;
    let isTie = false;

    for (const [id, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            eliminatedId = id;
            isTie = false;
        } else if (count === maxVotes) {
            isTie = true;
        }
    }

    let announcement = "";
    if (isTie || !eliminatedId) {
        announcement = "It's a TIE! Nobody was eliminated this round.";
        logger.info('Vote', `Vote resulted in a tie in room ${roomCode}`);
    } else {
        const eliminatedPlayer = room.players.find(p => p.id === eliminatedId);
        if (eliminatedPlayer) {
            eliminatedPlayer.isDead = true;
            announcement = `${eliminatedPlayer.name} has been ELIMINATED!`;
            logger.info('Elimination', `Player ${eliminatedPlayer.name} eliminated in room ${roomCode}`);
        }
    }

    room.announcement = announcement;

    const gameEngine = require('./gameEngine');
    gameEngine.broadcastSanitizedState(io, roomCode);

    // Wait and check win conditions
    setTimeout(() => {
        gameEngine.checkWinConditions(io, roomCode);
    }, CONSTANTS.RESULT_TIME * 1000);
}

module.exports = {
    startVotingRound,
    processVote,
    evaluateVotes
};
