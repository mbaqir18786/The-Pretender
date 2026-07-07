const timer = {
    localInterval: null,

    sync: function(serverTimerValue) {
        // We received an authoritative timer update from the server.
        // Update our local state and restart the interpolation interval.
        if (this.localInterval) {
            clearInterval(this.localInterval);
        }

        gameState.timer = serverTimerValue;
        this.updateDisplay();

        if (gameState.timer > 0 && gameState.gameState !== 'lobby' && gameState.gameState !== 'gameover') {
            this.localInterval = setInterval(() => {
                gameState.timer--;
                if (gameState.timer <= 0) {
                    gameState.timer = 0;
                    clearInterval(this.localInterval);
                }
                this.updateDisplay();
            }, 1000);
        }
    },

    updateDisplay: function() {
        const timerCountdown = document.getElementById('timerCountdown');
        const timerContainer = document.getElementById('timerContainer');
        
        if (gameState.timer > 0 && gameState.gameState !== 'lobby' && gameState.gameState !== 'gameover') {
            timerContainer.style.display = 'flex';
            timerCountdown.textContent = gameState.timer;
        } else {
            timerContainer.style.display = 'none';
        }
    }
};

window.timer = timer;
