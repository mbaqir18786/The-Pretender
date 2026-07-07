let socket = null;

const socketHandler = {
    init: function() {
        if (typeof io === 'undefined') {
            showToast("Socket.IO not loaded.");
            return;
        }

        socket = io();

        socket.on('connect', () => {
            console.log('Connected to server');
            // Reconnect flow handled in app.js if needed
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
