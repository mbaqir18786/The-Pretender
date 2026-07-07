const vote = {
    setupVotingPanel: function() {
        const votingGrid = document.getElementById('votingGrid');
        const voteStatusText = document.getElementById('voteStatusText');
        votingGrid.innerHTML = '';

        // Only active/alive players can vote, but everyone can see the grid
        const me = gameState.players.find(p => p.id === gameState.playerId);
        const amIDead = me ? me.isDead : true;

        if (gameState.hasVoted || amIDead) {
            voteStatusText.style.display = 'block';
            voteStatusText.textContent = amIDead ? "You cannot vote (Dead/Spectator)." : "Vote Recorded!";
        } else {
            voteStatusText.style.display = 'none';
        }

        gameState.players.forEach(p => {
            if (p.isDead || !p.connected) return; // Don't show dead/offline players as options

            const vCard = document.createElement('div');
            vCard.className = 'vote-card';
            vCard.textContent = p.name;

            if (p.id === gameState.playerId) {
                vCard.classList.add('disabled');
                vCard.textContent += " (You)";
            } else if (gameState.hasVoted || amIDead) {
                vCard.classList.add('disabled');
            } else {
                vCard.onclick = () => this.castVote(p.id, vCard);
            }

            // Check if this card was the one I voted for (requires state tracking if we want to highlight it, but server hides it until end usually. We'll just disable for now once voted).
            votingGrid.appendChild(vCard);
        });
    },

    castVote: function(targetId, cardElement) {
        if (gameState.hasVoted) return;

        socketHandler.emit('CAST_VOTE', {
            roomCode: gameState.roomCode,
            voterId: gameState.playerId,
            targetId: targetId
        }, (res) => {
            if (res.success) {
                cardElement.classList.add('selected');
                gameState.hasVoted = true;
                
                // Disable all other cards
                const allCards = document.querySelectorAll('.vote-card');
                allCards.forEach(c => {
                    c.onclick = null;
                    if (c !== cardElement) c.classList.add('disabled');
                });

                const voteStatusText = document.getElementById('voteStatusText');
                voteStatusText.style.display = 'block';
                voteStatusText.textContent = "Vote Recorded!";
            }
        });
    }
};

window.vote = vote;
