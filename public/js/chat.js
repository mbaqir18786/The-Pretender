const chat = {
    handleChatKey: function(event) {
        if (event.key === 'Enter') {
            this.sendChatMessage();
        }
    },

    sendChatMessage: utils.throttle(function() {
        const input = document.getElementById('chatInput');
        const msg = input.value.trim();
        
        if (!msg) return;

        socketHandler.emit('SEND_CHAT', {
            roomCode: gameState.roomCode,
            playerId: gameState.playerId,
            message: msg
        }, (response) => {
            if (response.success) {
                input.value = '';
            }
        });
    }, 500),

    renderMessage: function(senderName, message, isSystem) {
        const chatMessages = document.getElementById('chatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg';
        if (isSystem) {
            msgDiv.classList.add('system');
            msgDiv.textContent = message;
        } else {
            const senderDiv = document.createElement('div');
            senderDiv.className = 'chat-msg-sender';
            senderDiv.textContent = senderName;
            
            const contentDiv = document.createElement('div');
            contentDiv.textContent = message;
            
            msgDiv.appendChild(senderDiv);
            msgDiv.appendChild(contentDiv);
        }
        
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
};

window.chat = chat;
