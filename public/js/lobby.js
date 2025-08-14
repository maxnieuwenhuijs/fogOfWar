// Socket.io connection
let socket;

// Game session data
const gameSession = {
    roomCode: null,
    playerName: null,
    playerNumber: null,
    opponentName: null,
    isReady: false,
    opponentReady: false
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
const showJoinGameBtn = document.getElementById('show-join-game-btn');
const joinGameForm = document.getElementById('join-game-form');
const createGameOptions = document.getElementById('create-game-options');
const cancelJoinBtn = document.getElementById('cancel-join-btn');
const confirmCreateBtn = document.getElementById('confirm-create-btn');
const cancelCreateBtn = document.getElementById('cancel-create-btn');

// For radio group visibility
function getCreateVisibility() {
    try {
        const sel = document.querySelector('input[name="create-visibility"]:checked');
        return sel ? sel.value : 'public';
    } catch (_) { return 'public'; }
}

// Join Game Form
const joinNameInput = document.getElementById('join-name');
const roomCodeInput = document.getElementById('room-code');
const joinGameBtn = document.getElementById('join-game-btn');
const refreshGamesBtn = document.getElementById('refresh-games-btn');
const activeGamesList = document.getElementById('active-games-list');

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
    // Only create socket if not already exists and we're in multiplayer mode
    if (!socket && !gameState.singleplayerMode) {
        socket = io({ autoConnect: true });
        // Expose globally for menus and other modules
        try { window.socket = socket; } catch (_) { }
        console.log('Creating socket connection for multiplayer');
    }

    // Socket event listeners
    if (socket) {
        try { window.socket = socket; } catch (_) { }
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

        // Host receive join request to approve/deny via custom UI (no auto-decline)
        socket.on('joinRequest', ({ roomCode, playerName, requestId }) => {
            if (gameSession.playerNumber !== 1) return; // only host
            try {
                // Build lightweight modal
                let overlay = document.getElementById('join-approval-overlay');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.id = 'join-approval-overlay';
                    overlay.style.position = 'fixed';
                    overlay.style.left = '0';
                    overlay.style.top = '0';
                    overlay.style.right = '0';
                    overlay.style.bottom = '0';
                    overlay.style.background = 'rgba(0,0,0,0.45)';
                    overlay.style.display = 'flex';
                    overlay.style.alignItems = 'center';
                    overlay.style.justifyContent = 'center';
                    overlay.style.zIndex = '10000';

                    const card = document.createElement('div');
                    card.className = 'ui-panel';
                    card.style.maxWidth = '360px';
                    card.style.width = '90%';
                    card.style.textAlign = 'center';
                    card.innerHTML = `
                        <h3>Join Request</h3>
                        <p><strong>${playerName}</strong> wants to join room <strong>${roomCode}</strong>.</p>
                        <div style="display:flex; gap:10px; justify-content:center; margin-top:12px;">
                          <button id="approve-join-btn" class="action-button confirm-button">Accept</button>
                          <button id="deny-join-btn" class="action-button secondary-button">Deny</button>
                        </div>
                    `;
                    overlay.appendChild(card);
                    document.body.appendChild(overlay);

                    const cleanup = () => { try { overlay.remove(); } catch (_) { } };
                    card.querySelector('#approve-join-btn').addEventListener('click', () => {
                        socket.emit('resolveJoinRequest', { requestId, allow: true });
                        cleanup();
                    });
                    card.querySelector('#deny-join-btn').addEventListener('click', () => {
                        socket.emit('resolveJoinRequest', { requestId, allow: false });
                        cleanup();
                    });
                } else {
                    // If already exists, just focus/update content
                    overlay.querySelector('p').innerHTML = `<strong>${playerName}</strong> wants to join room <strong>${roomCode}</strong>.`;
                }
            } catch (e) {
                console.warn('Failed to present join approval UI, defaulting to deny safeguard');
            }
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

            // Set the game state before initializing the game
            window.gameState.currentPhase = gameState.currentPhase;
            window.gameState.cycleNumber = gameState.cycleNumber;
            window.gameState.roundNumber = gameState.roundNumber;

            // This is what's missing - set the current player for the first round
            window.gameState.currentPlayer = window.gameState.playerNumber;

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
}

// Show a specific screen and hide others
function showScreen(screenName) {
    Object.keys(screens).forEach(key => {
        screens[key].classList.remove('active');
    });
    screens[screenName].classList.add('active');

    // Show game stats bar when game screen is active
    const statsBar = document.querySelector('.game-stats-bar');
    if (statsBar) {
        if (screenName === 'game') {
            statsBar.style.display = 'block';
        } else {
            statsBar.style.display = 'none';
        }
    }

    // Ensure chat/settings overlays are hidden outside the game screen
    try {
        const chatPanel = document.getElementById('chat-panel');
        const infoPanel = document.getElementById('game-info-panel');
        if (screenName !== 'game') {
            if (chatPanel) { chatPanel.classList.remove('open'); chatPanel.style.display = 'none'; }
            if (infoPanel) { infoPanel.style.display = 'none'; }
        }
    } catch (_) { }
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
    // Create Game Button - shows options panel
    createGameBtn.addEventListener('click', () => {
        // Hide join form if open
        if (joinGameForm) joinGameForm.style.display = 'none';
        
        // Show create game options
        if (createGameOptions) {
            createGameOptions.style.display = 'block';
        }
    });
    
    // Confirm Create Button - actually creates the game
    if (confirmCreateBtn) {
        confirmCreateBtn.addEventListener('click', () => {
            const playerName = localStorage.getItem('mp_username') || 'Player';
            const visibility = getCreateVisibility();
            socket.emit('createGame', { playerName, visibility });
            if (createGameOptions) createGameOptions.style.display = 'none';
        });
    }
    
    // Cancel Create Button
    if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener('click', () => {
            if (createGameOptions) createGameOptions.style.display = 'none';
        });
    }

    // Show Join Game Button - toggles join form
    if (showJoinGameBtn) {
        showJoinGameBtn.addEventListener('click', () => {
            // Hide create options if open
            if (createGameOptions) createGameOptions.style.display = 'none';
            
            // Toggle join form
            if (joinGameForm) {
                joinGameForm.style.display = joinGameForm.style.display === 'none' ? 'block' : 'none';
                if (joinGameForm.style.display === 'block' && roomCodeInput) {
                    roomCodeInput.focus();
                }
            }
        });
    }

    // Cancel Join Button
    if (cancelJoinBtn) {
        cancelJoinBtn.addEventListener('click', () => {
            if (joinGameForm) joinGameForm.style.display = 'none';
            if (roomCodeInput) roomCodeInput.value = '';
        });
    }

    // Join Game Button
    joinGameBtn.addEventListener('click', () => {
        const playerName = localStorage.getItem('mp_username') || 'Player';
        const roomCode = (roomCodeInput?.value || '').trim().toUpperCase();

        if (!roomCode || roomCode.length !== 6) {
            showToast('Please enter a valid 6-character room code');
            return;
        }

        socket.emit('joinGame', { roomCode, playerName });
        if (joinGameForm) joinGameForm.style.display = 'none';
    });

    // Active games refresh
    if (refreshGamesBtn && activeGamesList) {
        const renderGames = (games = []) => {
            activeGamesList.innerHTML = '';
            if (!games.length) {
                const li = document.createElement('li');
                li.textContent = 'No public games available';
                activeGamesList.appendChild(li);
                return;
            }
            games.forEach(g => {
                const li = document.createElement('li');
                const meta = document.createElement('span');
                meta.className = 'meta';
                meta.textContent = `${g.roomCode} • Host: ${g.hostName} • Players: ${g.players}/2`;
                const joinBtn = document.createElement('button');
                joinBtn.className = 'action-button';
                joinBtn.textContent = 'Join';
                joinBtn.addEventListener('click', () => {
                    const playerName = (localStorage.getItem('mp_username') || 'Guest').trim();
                    socket.emit('joinGame', { roomCode: g.roomCode, playerName });
                });
                li.appendChild(meta);
                li.appendChild(joinBtn);
                activeGamesList.appendChild(li);
            });
        };
        const fetchGames = () => socket?.emit('listPublicGames');
        refreshGamesBtn.addEventListener('click', fetchGames);
        // Auto-refresh when opening lobby screen
        setInterval(() => {
            if (screens.lobby.classList.contains('active')) fetchGames();
        }, 8000);

        // Receive list
        socket?.on('publicGames', (games) => renderGames(games));
    }

    // Ready Button
    readyBtn.addEventListener('click', () => {
        gameSession.isReady = true;
        socket.emit('playerReady', gameSession.roomCode);
        updateLobbyUI();
    });

    // Enter key in input fields (guard for removed fields on new flow)
    if (createNameInput) {
        createNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') createGameBtn.click();
        });
    }

    if (joinNameInput) {
        joinNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && roomCodeInput?.value?.trim()) joinGameBtn.click();
        });
    }

    if (roomCodeInput) {
        roomCodeInput.addEventListener('keypress', (e) => {
            const name = (localStorage.getItem('mp_username') || joinNameInput?.value || '').trim();
            if (e.key === 'Enter' && name) joinGameBtn.click();
        });
    }
}

// Initialize the lobby
function initializeLobby() {
    initializeSocket();
    setupEventListeners();
    
    // Add back button handler
    const lobbyBackBtn = document.getElementById('lobby-back-btn');
    if (lobbyBackBtn && !lobbyBackBtn.hasAttribute('data-initialized')) {
        lobbyBackBtn.setAttribute('data-initialized', 'true');
        lobbyBackBtn.addEventListener('click', function() {
            // Disconnect from socket if connected
            if (socket && socket.connected) {
                socket.disconnect();
                socket = null;
                window.socket = null;
            }
            
            // Hide lobby screen
            if (screens.lobby) {
                screens.lobby.classList.remove('active');
            }
            
            // Show main menu
            if (typeof menuSystem !== 'undefined' && typeof menuSystem.showMainMenu === 'function') {
                menuSystem.showMainMenu();
            }
        });
    }
}

// Initialize when DOM is loaded
// Commented out to prevent automatic connection - will be called when multiplayer is selected
// document.addEventListener('DOMContentLoaded', initializeLobby);

// Make initializeLobby available globally for menu system
window.initializeLobby = initializeLobby;
