let socket = null;

const socketHandler = {
    init: function() {
        if (typeof io === 'undefined') {
            if (typeof showToast === 'function') {
                showToast("Socket.IO not loaded. Please refresh.");
            }
            console.error("Socket.IO client library is not loaded.");
            return;
        }

        // Auto-detect server URL (supports direct localhost:3000, Live Server on port 5500, or deployed cloud URLs)
        let serverUrl = undefined;
        if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'))) {
            serverUrl = 'http://localhost:3000';
        }

        socket = serverUrl ? io(serverUrl) : io();

        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('connect_error', (err) => {
            console.warn('Socket connection error:', err.message);
        });

        socket.on('UPDATE_ROOM_STATE', (serverState) => {
            gameState.gameState = serverState.gameState;
            gameState.timer = serverState.timer;
            gameState.players = serverState.players;
            gameState.currentWordPair = serverState.currentWordPair || null;

            const me = gameState.players.find(p => p.id === gameState.playerId);
            if (me) {
                gameState.isHost = me.isHost;
                gameState.myRole = me.isDead ? 'spectator' : me.role;
                gameState.myWord = me.word;
                gameState.hasVoted = me.vote !== null;
            }

            ui.updateAllPanels(serverState.announcement);
            timer.sync(serverState.timer);
        });

        socket.on('CHAT_MESSAGE', (data) => {
            chat.renderMessage(data.senderName, data.message, data.isSystem);
        });

        socket.on('disconnect', () => {
            console.warn('Disconnected from server');
        });
    },

    emit: function(event, data, callback) {
        if (!socket || !socket.connected) {
            if (callback) callback({ error: 'Not connected to server' });
            return;
        }
        socket.emit(event, data, (response) => {
            if (response && response.error) {
                showToast(response.error);
            }
            if (callback) callback(response);
        });
    }
};

window.socketHandler = socketHandler;
