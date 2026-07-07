const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const STATE_FILE = path.join(__dirname, 'data', 'server_state.json');

// Memory store
const state = {
    rooms: {}, // roomCode -> roomData
    activeCodes: new Set(),
    socketMap: {} // socketId -> { playerId, roomCode }
};

// Periodic persistence
function saveState() {
    try {
        const dataToSave = {
            rooms: state.rooms,
            activeCodes: Array.from(state.activeCodes)
        };
        fs.writeFileSync(STATE_FILE, JSON.stringify(dataToSave), 'utf-8');
    } catch (err) {
        logger.error('State', 'Failed to save server state', err);
    }
}

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const raw = fs.readFileSync(STATE_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            state.rooms = parsed.rooms || {};
            state.activeCodes = new Set(parsed.activeCodes || []);
            logger.info('State', 'Successfully loaded state from disk');
        }
    } catch (err) {
        logger.error('State', 'Failed to load server state', err);
    }
}

// Auto-save every 10 seconds
setInterval(saveState, 10000);

module.exports = {
    state,
    loadState,
    saveState
};
