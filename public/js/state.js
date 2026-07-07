const state = {
    playerId: '',
    playerName: '',
    roomCode: '',
    reconnectToken: '',
    isHost: false,
    players: [],      // Array of { id, name, isHost, isReady, isDead, vote, connected, role, word }
    gameState: 'lobby', // 'lobby', 'reveal', 'discuss', 'vote', 'results', 'gameover'
    myRole: 'normal',   // 'normal' or 'pretender' or 'spectator'
    myWord: '',
    currentWordPair: null,
    timer: 0,
    hasVoted: false
};

window.gameState = state; // Make accessible to other modules
