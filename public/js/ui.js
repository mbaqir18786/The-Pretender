const ui = {
    updateAllPanels: function(announcement) {
        this.renderPlayersList();
        this.updateHostPrivileges();
        
        // Timer display
        const timerContainer = document.getElementById('timerContainer');
        if (gameState.timer > 0 && gameState.gameState !== 'lobby' && gameState.gameState !== 'gameover') {
            timerContainer.style.display = 'flex';
        } else {
            timerContainer.style.display = 'none';
        }

        this.deactivateAllPanels();

        switch(gameState.gameState) {
            case 'lobby':
                document.getElementById('panelLobby').classList.add('active');
                break;
            case 'reveal':
                document.getElementById('panelSecretReveal').classList.add('active');
                game.setupSecretRevealPanel();
                break;
            case 'discuss':
                document.getElementById('panelDiscussion').classList.add('active');
                break;
            case 'vote':
                document.getElementById('panelVoting').classList.add('active');
                vote.setupVotingPanel();
                break;
            case 'results':
                document.getElementById('panelResults').classList.add('active');
                document.getElementById('eliminatedResultBox').textContent = announcement || "Evaluating results...";
                break;
            case 'gameover':
                document.getElementById('panelGameOver').classList.add('active');
                game.setupGameOverPanel(announcement);
                break;
        }
    },

    deactivateAllPanels: function() {
        const panels = document.querySelectorAll('.step-panel');
        panels.forEach(p => p.classList.remove('active'));
    },

    updateHostPrivileges: function() {
        const btnStart = document.getElementById('btnStartGame');
        const waitMsg = document.getElementById('hostWaitMessage');
        const btnPlayAgain = document.getElementById('btnPlayAgain');
        const hostLabel = document.getElementById('hostLabel');

        if (gameState.isHost) {
            btnStart.style.display = 'block';
            waitMsg.style.display = 'none';
            btnPlayAgain.style.display = 'block';
            hostLabel.textContent = 'HOST';
        } else {
            btnStart.style.display = 'none';
            waitMsg.style.display = 'block';
            btnPlayAgain.style.display = 'none';
            hostLabel.textContent = 'GUEST';
        }
    },

    renderPlayersList: function() {
        const listDiv = document.getElementById('playersList');
        const countSpan = document.getElementById('playerCount');
        
        listDiv.innerHTML = '';
        
        if (gameState.players) {
            countSpan.textContent = gameState.players.length;
            
            gameState.players.forEach(p => {
                const item = document.createElement('div');
                item.className = 'player-item';
                if (p.id === gameState.playerId) item.classList.add('is-me');
                if (p.isHost) item.classList.add('is-host');
                if (p.isDead) item.classList.add('is-dead');
                if (!p.connected) item.classList.add('is-disconnected');

                const nameDiv = document.createElement('div');
                nameDiv.textContent = p.name;
                
                const statusDiv = document.createElement('div');
                
                if (!p.connected) {
                    statusDiv.innerHTML = `<span class="player-badge badge-disconnected">Offline</span>`;
                } else if (p.isDead) {
                    statusDiv.innerHTML = `<span class="player-badge badge-dead">Dead</span>`;
                } else if (gameState.gameState === 'reveal' || gameState.gameState === 'lobby') {
                    if (p.isReady) {
                        statusDiv.innerHTML = `<span class="player-badge badge-ready">Ready</span>`;
                    } else {
                        statusDiv.innerHTML = `<span class="player-badge badge-waiting">Wait</span>`;
                    }
                } else if (gameState.gameState === 'vote') {
                    if (p.vote !== null) {
                        statusDiv.innerHTML = `<span class="player-badge badge-ready">Voted</span>`;
                    } else {
                        statusDiv.innerHTML = `<span class="player-badge badge-waiting">Thinking</span>`;
                    }
                } else {
                    statusDiv.innerHTML = `<span class="player-badge badge-ready">Alive</span>`;
                }

                item.appendChild(nameDiv);
                item.appendChild(statusDiv);
                listDiv.appendChild(item);
            });
        }
    }
};

window.ui = ui;
