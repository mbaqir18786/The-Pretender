const app = {
    init: function() {
        let storedId = localStorage.getItem('pretender_player_id');
        if (!storedId) {
            storedId = 'P-' + Math.floor(100000 + Math.random() * 900000);
            localStorage.setItem('pretender_player_id', storedId);
        }
        gameState.playerId = storedId;

        let storedName = localStorage.getItem('pretender_player_name');
        if (storedName) {
            document.getElementById('inputPlayerName').value = storedName;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const rCode = urlParams.get('room');
        if (rCode) {
            const sanitizedCode = utils.sanitizeText(rCode, 6).toUpperCase();
            document.getElementById('inputRoomCode').value = sanitizedCode;
            showToast("Found room link! Just enter your name and join.");
        }

        socketHandler.init();

        // Attempt reconnect if we have a token
        this.attemptReconnect();
    },

    attemptReconnect: function() {
        const storedRoomCode = localStorage.getItem('pretender_active_room_code');
        const token = localStorage.getItem('pretender_reconnect_token');
        const storedName = localStorage.getItem('pretender_player_name');

        if (storedRoomCode && token && storedName) {
            gameState.playerName = utils.sanitizeText(storedName, 16);
            gameState.roomCode = utils.sanitizeText(storedRoomCode, 6).toUpperCase();
            
            // Reconnect via socket
            setTimeout(() => {
                socketHandler.emit('RECONNECT', {
                    roomCode: gameState.roomCode,
                    playerId: gameState.playerId,
                    token: token
                }, (response) => {
                    if (response && response.success) {
                        this.enterRoomUI();
                        showToast("Reconnected successfully.");
                    } else {
                        // Failed to reconnect (expired or invalid)
                        this.clearSession();
                    }
                });
            }, 500); // Give socket time to connect initially
        }
    },

    createRoom: utils.throttle(function() {
        const rawName = document.getElementById('inputPlayerName').value.trim();
        const nameInput = utils.sanitizeText(rawName, 16);
        if (!nameInput || nameInput.length < 2) {
            showToast("Please enter a username (2-16 chars)!");
            return;
        }

        gameState.playerName = nameInput;
        localStorage.setItem('pretender_player_name', nameInput);

        socketHandler.emit('CREATE_ROOM', {
            playerName: nameInput,
            playerId: gameState.playerId
        }, (res) => {
            if (res.success) {
                gameState.roomCode = res.roomCode;
                localStorage.setItem('pretender_active_room_code', res.roomCode);
                localStorage.setItem('pretender_reconnect_token', res.token);
                this.enterRoomUI();
                showToast("Room created! Copy code or URL to invite others.");
            }
        });
    }, 2000),

    joinRoom: utils.throttle(function() {
        const rawName = document.getElementById('inputPlayerName').value.trim();
        const rawCode = document.getElementById('inputRoomCode').value.trim().toUpperCase();
        
        const nameInput = utils.sanitizeText(rawName, 16);
        const codeInput = utils.sanitizeText(rawCode, 6);

        if (!nameInput || nameInput.length < 2) {
            showToast("Please enter a valid username (2-16 characters)!");
            return;
        }
        if (codeInput.length !== 6) {
            showToast("Please enter a valid 6-character Room Code.");
            return;
        }

        gameState.playerName = nameInput;
        localStorage.setItem('pretender_player_name', nameInput);

        socketHandler.emit('JOIN_ROOM', {
            roomCode: codeInput,
            playerName: nameInput,
            playerId: gameState.playerId
        }, (res) => {
            if (res.success) {
                gameState.roomCode = res.roomCode;
                localStorage.setItem('pretender_active_room_code', res.roomCode);
                localStorage.setItem('pretender_reconnect_token', res.token);
                this.enterRoomUI();
                showToast("Joined the room.");
            }
        });
    }, 2000),

    leaveRoom: function() {
        socketHandler.emit('LEAVE_ROOM', {
            roomCode: gameState.roomCode,
            playerId: gameState.playerId
        }, () => {
            this.clearSession();
            
            gameState.roomCode = '';
            gameState.isHost = false;
            gameState.players = [];
            gameState.gameState = 'lobby';
            
            if (timer.localInterval) clearInterval(timer.localInterval);
            
            document.getElementById('viewGame').classList.remove('active');
            document.getElementById('viewHome').classList.add('active');
            window.history.pushState({}, document.title, window.location.pathname);
            
            showToast("Left the room.");
        });
    },

    clearSession: function() {
        localStorage.removeItem('pretender_active_room_code');
        localStorage.removeItem('pretender_reconnect_token');
    },

    enterRoomUI: function() {
        document.getElementById('viewHome').classList.remove('active');
        document.getElementById('viewGame').classList.add('active');
        document.getElementById('roomCodeVal').textContent = gameState.roomCode;
        
        // Update URL for easy sharing
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + gameState.roomCode;
        window.history.pushState({path:newUrl}, '', newUrl);
    },

    copyRoomLink: function() {
        const url = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + gameState.roomCode;
        navigator.clipboard.writeText(url).then(() => {
            showToast("Room link copied to clipboard!");
        });
    }
};

window.app = app;

window.addEventListener('load', () => {
    app.init();
});
