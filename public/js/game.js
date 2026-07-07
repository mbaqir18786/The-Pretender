const game = {
    requestStartGame: utils.throttle(function() {
        if (!gameState.isHost) return;
        socketHandler.emit('START_GAME', {
            roomCode: gameState.roomCode,
            playerId: gameState.playerId
        });
    }, 2000),

    setupSecretRevealPanel: function() {
        const secretRole = document.getElementById('secretRoleBadge');
        const secretWord = document.getElementById('secretWordDisplay');
        const btnReady = document.getElementById('btnReadyUp');
        const readyStatus = document.getElementById('readyStatusText');

        // Reset blur
        const card = document.getElementById('secretWordCard');
        card.classList.add('blurred');

        const me = gameState.players.find(p => p.id === gameState.playerId);
        
        if (me && me.isDead) {
            secretRole.textContent = "SPECTATOR";
            secretRole.style.background = "var(--spectator)";
            secretWord.textContent = "SPECTATING ROUND";
            btnReady.style.display = 'none';
            readyStatus.style.display = 'block';
            readyStatus.textContent = "Spectating Round — Waiting for Active Players";
        } else {
            secretRole.textContent = gameState.myRole === 'pretender' ? "PRETENDER" : "NORMAL";
            secretRole.style.background = gameState.myRole === 'pretender' ? "var(--accent)" : "var(--secondary)";
            secretWord.textContent = gameState.myWord !== 'hidden' ? gameState.myWord : '???';

            if (me && me.isReady) {
                btnReady.style.display = 'none';
                readyStatus.style.display = 'block';
                readyStatus.textContent = "✓ Ready! Waiting for others...";
            } else {
                btnReady.style.display = 'block';
                readyStatus.style.display = 'none';
            }
        }
    },

    toggleSecretBlur: function() {
        const card = document.getElementById('secretWordCard');
        card.classList.toggle('blurred');
    },

    readyUp: utils.throttle(function() {
        socketHandler.emit('READY_UP', {
            roomCode: gameState.roomCode,
            playerId: gameState.playerId
        });
    }, 500),

    setupGameOverPanel: function(announcement) {
        document.getElementById('winTitle').textContent = announcement;
        
        if (gameState.currentWordPair) {
            document.getElementById('endNormalWord').textContent = gameState.currentWordPair.normal;
            document.getElementById('endPretenderWord').textContent = gameState.currentWordPair.pretender;
        }

        const pretenderList = document.getElementById('endPretenderList');
        pretenderList.innerHTML = '';
        
        const pretenders = gameState.players.filter(p => p.role === 'pretender');
        pretenders.forEach(p => {
            const span = document.createElement('span');
            span.style.background = 'var(--accent)';
            span.style.color = '#FFF';
            span.style.padding = '2px 8px';
            span.style.border = '2px solid #000';
            span.style.borderRadius = '4px';
            span.textContent = p.name;
            pretenderList.appendChild(span);
        });

        const btnPlayAgain = document.getElementById('btnPlayAgain');
        if (gameState.isHost) {
            btnPlayAgain.style.display = 'block';
        } else {
            btnPlayAgain.style.display = 'none';
        }
    },

    playAgain: utils.throttle(function() {
        if (!gameState.isHost) return;
        socketHandler.emit('START_GAME', {
            roomCode: gameState.roomCode,
            playerId: gameState.playerId
        });
    }, 2000)
};

window.game = game;
