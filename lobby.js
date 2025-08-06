// Socket.io connection
let socket;

// Game session data
const gameSession = {
    roomCode: null,
    playerName: null,
    playerNumber: null,
    opponentName: null,
    isReady: false,
    opponentReady: false,
    initialGameState: null  // Add this line
};

// DOM Elements
const screens = {
    lobby: document.getElementById('lobby-screen'),
    waiting: document.getElementById('waiting-screen'),
    gameLobby: document.getElementById('game-lobby-screen'),
    game: document.getElementById('game-screen')
};

// Create Game Form
const createNameInput = document.getElementById('create-name');
const createGameBtn = document.getElementById('create-game-btn');

// Join Game Form
const joinNameInput = document.getElementById('join-name');
const roomCodeInput = document.getElementById('room-code');
const joinGameBtn = document.getElementById('join-game-btn');

// Waiting screen
const displayRoomCode = document.getElementById('display-room-code');
const waitingMessage = document.getElementById('waiting-message');

// Game Lobby
const lobbyRoomCode = document.getElementById('lobby-room-code');
const player1Name = document.getElementById('player1-name');
const player2Name = document.getElementById('player2-name');
const player1Ready = document.getElementById('player1-ready');
const player2Ready = document.getElementById('player2-ready');
const readyBtn = document.getElementById('ready-btn');
const gameStatusMessage = document.getElementById('game-status-message');

// Game Room Info
const gameRoomCode = document.getElementById('game-room-code');
const playerNum = document.getElementById('player-num');
const playerIndicator = document.getElementById('player-indicator');

// Toast notification
const toastNotification = document.getElementById('toast-notification');
const toastMessage = document.getElementById('toast-message');

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io();

    // Socket event listeners
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('gameCreated', (data) => {
        console.log('Game created:', data);
        gameSession.roomCode = data.roomCode;
        gameSession.playerName = data.playerName;
        gameSession.playerNumber = data.playerNumber;

        // Update UI
        displayRoomCode.textContent = data.roomCode;
        showScreen('waiting');
    });

    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data);
        gameSession.opponentName = data.player2Name;

        // Update UI
        showScreen('gameLobby');
        updateLobbyUI();
    });

    socket.on('gameJoined', (data) => {
        console.log('Joined game:', data);
        gameSession.roomCode = data.roomCode;
        gameSession.playerName = data.playerName;
        gameSession.playerNumber = data.playerNumber;
        gameSession.opponentName = data.player1Name;

        // Update UI
        showScreen('gameLobby');
        updateLobbyUI();
    });

    socket.on('playerIsReady', (data) => {
        console.log('Player is ready:', data);
        if (data.playerNum !== gameSession.playerNumber) {
            gameSession.opponentReady = true;
            updateLobbyUI();
        }
    });

    socket.on('gameStart', (gameState) => {
        console.log('Game starting:', gameState);

        // Store the initial game state in gameSession for later use
        gameSession.initialGameState = {
            currentPhase: gameState.currentPhase,
            cycleNumber: gameState.cycleNumber,
            roundNumber: gameState.roundNumber
        };

        // Switch to game screen and initialize
        showScreen('game');
        initGame();
    });


    socket.on('error', (errorMessage) => {
        console.error('Socket error:', errorMessage);
        showToast(errorMessage);
    });

    socket.on('playerDisconnected', (data) => {
        console.log('Player disconnected:', data);
        showToast(`Player ${data.playerNum} disconnected`);

        // If in lobby, go back to main screen
        if (screens.gameLobby.classList.contains('active')) {
            showScreen('lobby');
        }
    });
}

// Show a specific screen and hide others
function showScreen(screenName) {
    Object.keys(screens).forEach(key => {
        screens[key].classList.remove('active');
    });
    screens[screenName].classList.add('active');
}

// Update the lobby UI based on game session data
function updateLobbyUI() {
    lobbyRoomCode.textContent = gameSession.roomCode;

    if (gameSession.playerNumber === 1) {
        player1Name.textContent = gameSession.playerName;
        player2Name.textContent = gameSession.opponentName || 'Waiting...';

        player1Ready.textContent = gameSession.isReady ? 'Ready' : 'Not Ready';
        player2Ready.textContent = gameSession.opponentReady ? 'Ready' : 'Not Ready';

        if (gameSession.isReady) {
            player1Ready.classList.add('ready');
        } else {
            player1Ready.classList.remove('ready');
        }

        if (gameSession.opponentReady) {
            player2Ready.classList.add('ready');
        } else {
            player2Ready.classList.remove('ready');
        }
    } else {
        player1Name.textContent = gameSession.opponentName || 'Waiting...';
        player2Name.textContent = gameSession.playerName;

        player1Ready.textContent = gameSession.opponentReady ? 'Ready' : 'Not Ready';
        player2Ready.textContent = gameSession.isReady ? 'Ready' : 'Not Ready';

        if (gameSession.opponentReady) {
            player1Ready.classList.add('ready');
        } else {
            player1Ready.classList.remove('ready');
        }

        if (gameSession.isReady) {
            player2Ready.classList.add('ready');
        } else {
            player2Ready.classList.remove('ready');
        }
    }

    if (gameSession.isReady) {
        readyBtn.disabled = true;
        readyBtn.textContent = "You're Ready";
    } else {
        readyBtn.disabled = false;
        readyBtn.textContent = "I'm Ready";
    }

    // Update game status message
    if (gameSession.isReady && gameSession.opponentReady) {
        gameStatusMessage.textContent = "Both players ready! Starting game...";
    } else if (gameSession.isReady) {
        gameStatusMessage.textContent = "Waiting for opponent to be ready...";
    } else if (gameSession.opponentReady) {
        gameStatusMessage.textContent = "Your opponent is ready. Click 'I'm Ready' to start!";
    } else {
        gameStatusMessage.textContent = "Both players must be ready to start the game";
    }
}

// Show toast notification
function showToast(message, duration = 3000) {
    toastMessage.textContent = message;
    toastNotification.classList.remove('toast-hidden');
    toastNotification.classList.add('toast-visible');

    setTimeout(() => {
        toastNotification.classList.remove('toast-visible');
        toastNotification.classList.add('toast-hidden');
    }, duration);
}

// Event listeners
function setupEventListeners() {
    // Create Game Button
    createGameBtn.addEventListener('click', () => {
        const playerName = createNameInput.value.trim();
        if (playerName) {
            socket.emit('createGame', playerName);
        } else {
            showToast('Please enter your name');
        }
    });

    // Join Game Button
    joinGameBtn.addEventListener('click', () => {
        const playerName = joinNameInput.value.trim();
        const roomCode = roomCodeInput.value.trim().toUpperCase();

        if (!playerName) {
            showToast('Please enter your name');
            return;
        }

        if (!roomCode || roomCode.length !== 6) {
            showToast('Please enter a valid 6-character room code');
            return;
        }

        socket.emit('joinGame', { roomCode, playerName });
    });

    // Ready Button
    readyBtn.addEventListener('click', () => {
        gameSession.isReady = true;
        socket.emit('playerReady', gameSession.roomCode);
        updateLobbyUI();
    });

    // Enter key in input fields
    createNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createGameBtn.click();
    });

    joinNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && roomCodeInput.value.trim()) joinGameBtn.click();
    });

    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && joinNameInput.value.trim()) joinGameBtn.click();
    });
}

// Initialize the lobby
function initializeLobby() {
    initializeSocket();
    setupEventListeners();
}

// Initialize when DOM is loaded
// Commented out to prevent automatic connection - will be called when multiplayer is selected
// document.addEventListener('DOMContentLoaded', initializeLobby);