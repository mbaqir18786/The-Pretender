const { state } = require('./state');
const logger = require('./logger');

const timers = {}; // roomCode -> intervalId

function startTimer(io, roomCode, duration, onEndCallback) {
    const room = state.rooms[roomCode];
    if (!room) return;

    if (timers[roomCode]) {
        clearInterval(timers[roomCode]);
    }

    room.timer = duration;
    const gameEngine = require('./gameEngine');
    gameEngine.broadcastSanitizedState(io, roomCode);

    timers[roomCode] = setInterval(() => {
        const currentRoom = state.rooms[roomCode];
        if (!currentRoom) {
            clearInterval(timers[roomCode]);
            return;
        }

        currentRoom.timer--;

        if (currentRoom.timer <= 0) {
            clearInterval(timers[roomCode]);
            if (onEndCallback) onEndCallback();
        } else {
            // Only sync timer every few seconds to reduce overhead,
            // but we need to keep client in sync. The client will
            // interpolate, so we only broadcast occasionally or just let
            // the initial broadcast handle it. For now, broadcast every second.
            gameEngine.broadcastSanitizedState(io, roomCode);
        }
    }, 1000);
}

function clearRoomTimer(roomCode) {
    if (timers[roomCode]) {
        clearInterval(timers[roomCode]);
        delete timers[roomCode];
    }
}

module.exports = {
    startTimer,
    clearRoomTimer
};
