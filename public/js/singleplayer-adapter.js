// Singleplayer Adapter - Bridges AI actions with game logic

// Override socket handlers for single player mode
function initSinglePlayerMode() {
    console.log('Initializing single player mode...');
    
    // Ensure all required globals exist
    if (typeof gameState === 'undefined') {
        console.error('gameState not defined, cannot init single player');
        return;
    }
    
    // Mark as single player mode to stop other scripts from waiting for socket
    gameState.singleplayerMode = true;
    if (typeof window.gameState === 'undefined') {
        window.gameState = gameState;
    }
    window.gameState.singleplayerMode = true;
    
    // Create AI opponent
    if (!window.aiOpponent && gameState.aiDifficulty) {
        window.aiOpponent = createAIOpponent(gameState.aiDifficulty);
    }
    
    // Ensure globals are available for game-logic.js checks FIRST
    console.log('🔧 Setting up global variables for single player');
    if (typeof socket === 'undefined') {
        window.socket = window.socket || { emit: function() {} };
        globalThis.socket = window.socket;
    }
    if (typeof gameSession === 'undefined') {
        globalThis.gameSession = window.gameSession || { roomCode: 'SINGLE' }; 
    }
    
    console.log('🔧 Global check after setup:', {
        socketType: typeof socket,
        sessionType: typeof gameSession,
        socketExists: !!socket,
        sessionExists: !!gameSession
    });
    
    // Override socket emit to intercept player actions
    if (socket && !socket._originalEmit) {
        console.log('🔧 Setting up socket override for single player mode');
        socket._originalEmit = socket.emit;
        socket.emit = function(eventName, data) {
            console.log('🔧 Socket emit intercepted:', eventName, data);
            if (gameState.singleplayerMode) {
                console.log('🔧 Handling event locally for single player:', eventName);
                // Handle the event locally instead of sending to server
                handleSinglePlayerEvent(eventName, data);
            } else if (socket._originalEmit) {
                console.log('🔧 Using original emit for multiplayer');
                // Multiplayer mode - use original emit
                socket._originalEmit.call(socket, eventName, data);
            }
        };
        console.log('🔧 Socket override setup complete');
    } else {
        console.log('🔧 Socket override skipped - socket missing or already overridden:', {
            hasSocket: !!socket,
            hasOriginalEmit: !!(socket && socket._originalEmit)
        });
    }
    
    // Initialize game state for single player
    gameState.definedCards = {};
    gameState.playerNumber = 1; // Ensure player number is set
    gameState.players = {
        1: {
            name: 'Player',
            pawns: [],
            availableCards: [],
            capturedPawns: 0
        },
        2: {
            name: 'AI Commander', 
            pawns: [],
            availableCards: [],
            capturedPawns: 0
        }
    };
    
    // Start the game phases after a delay to ensure everything is loaded
    setTimeout(() => {
        console.log('Single player adapter starting game, current phase:', gameState.currentPhase);
        console.log('Player number:', gameState.playerNumber);
        
        // Ensure player number is set
        if (!gameState.playerNumber) {
            gameState.playerNumber = 1;
            console.log('Set player number to 1 for single player');
        }
        
        // Force the game to start card definition phase
        gameState.currentPhase = 'SETUP1_DEFINE';
        
        if (typeof handleCardDefinition === 'function') {
            console.log('Starting card definition phase for single player');
            handleCardDefinition();
            
            // Trigger AI card definition if it's their turn
            const definingPlayer = getDefiningPlayerForRound(gameState.roundNumber);
            if (definingPlayer === 2 && window.aiOpponent) {
                console.log('AI turn to define cards');
                window.aiOpponent.generateCardDefinition(1);
            }
        } else {
            console.error('handleCardDefinition function not found!');
        }
    }, 1000);
}

// Handle events in single player mode
function handleSinglePlayerEvent(eventName, data) {
    console.log('🎮 Single player event:', eventName, data);
    console.log('🎮 Game state check:', {
        singleplayerMode: gameState.singleplayerMode,
        playerNumber: gameState.playerNumber,
        currentPhase: gameState.currentPhase
    });
    
    switch (eventName) {
        case 'defineCards':
            handlePlayerCardDefinition(data);
            break;
            
        case 'linkCard':
            handlePlayerLinking(data);
            break;
            
        case 'gameAction':
            if (data.type === 'move') {
                handlePlayerMove(data);
            } else if (data.type === 'attack') {
                handlePlayerAttack(data);
            }
            break;
            
        case 'playerCannotAct':
            handlePlayerEndTurn();
            break;
            
        case 'submitRpsChoice':
            handlePlayerRPSChoice(data);
            break;
    }
}

// Player defines cards
function handlePlayerCardDefinition(data) {
    console.log('🎮 Player card definition received:', data);
    
    // Store player's cards
    if (!gameState.definedCards) gameState.definedCards = {};
    gameState.definedCards[data.playerNum] = data.cards;
    
    console.log('🎮 Cards stored for player', data.playerNum, '- defined cards:', gameState.definedCards);
    
    // Advance phase
    advanceCardPhase();
}

// AI opponent handlers
function handleOpponentCardDefinition(data) {
    if (!gameState.singleplayerMode) return;
    
    // Store AI's cards
    if (!gameState.definedCards) gameState.definedCards = {};
    gameState.definedCards[data.player] = data.cards;
    
    // Reveal cards if both players have defined
    if (gameState.definedCards[1] && gameState.definedCards[2]) {
        // Show card reveal UI
        displayCardReveal(gameState.definedCards[1], gameState.definedCards[2]);
        
        // Calculate initiative
        const p1Attack = gameState.definedCards[1].reduce((sum, card) => sum + card.attack, 0);
        const p2Attack = gameState.definedCards[2].reduce((sum, card) => sum + card.attack, 0);
        
        if (p1Attack > p2Attack) {
            gameState.currentPlayer = 1;
            updateInitiativeDisplay(1, `Superior Firepower: ${p1Attack} vs ${p2Attack}`);
        } else if (p2Attack > p1Attack) {
            gameState.currentPlayer = 2;
            updateInitiativeDisplay(2, `Superior Firepower: ${p2Attack} vs ${p1Attack}`);
        } else {
            // Tie - need RPS
            showRPSTiebreaker();
            return;
        }
        
        // Move to linking phase after delay
        setTimeout(() => {
            advanceToLinkingPhase();
        }, 3000);
    }
}

// Advance through card definition phases
function advanceCardPhase() {
    console.log('🎮 Advancing card phase from:', gameState.currentPhase);
    
    const phaseMap = {
        'SETUP1_DEFINE': 'SETUP2_DEFINE',
        'SETUP2_DEFINE': 'SETUP3_DEFINE',
        'SETUP3_DEFINE': 'SETUP1_LINKING'
    };
    
    const nextPhase = phaseMap[gameState.currentPhase];
    if (nextPhase) {
        gameState.currentPhase = nextPhase;
        gameState.roundNumber = parseInt(nextPhase.charAt(5));
        
        console.log('🎮 Advanced to phase:', nextPhase, 'round:', gameState.roundNumber);
        
        if (nextPhase.includes('DEFINE')) {
            // Continue card definition
            handleCardDefinition();
            
            // Trigger AI if it's their turn
            const definingPlayer = getDefiningPlayerForRound(gameState.roundNumber);
            console.log('🎮 Defining player for round', gameState.roundNumber, ':', definingPlayer);
            
            if (definingPlayer === 2 && window.aiOpponent) {
                console.log('🤖 Triggering AI card definition for round', gameState.roundNumber);
                window.aiOpponent.generateCardDefinition(gameState.roundNumber);
            }
        } else {
            // All cards defined, reveal them
            console.log('🎮 All definition phases complete, checking for card reveal');
            if (gameState.definedCards[1] && gameState.definedCards[2]) {
                console.log('🎮 Both players have defined cards, revealing...');
                handleOpponentCardDefinition({ player: 2, cards: gameState.definedCards[2] });
            } else {
                console.log('🎮 Missing cards - P1:', !!gameState.definedCards[1], 'P2:', !!gameState.definedCards[2]);
            }
        }
        
        if (typeof updateGameStatusUI === 'function') {
            updateGameStatusUI();
        }
    } else {
        console.log('🎮 No next phase found for:', gameState.currentPhase);
    }
}

// Move to linking phase
function advanceToLinkingPhase() {
    console.log('🔗 Advancing to linking phase...');
    gameState.currentPhase = 'SETUP1_LINKING';
    gameState.roundNumber = 1;
    
    // Create available cards for both players
    createAvailableCardsFromDefined();
    
    // CRITICAL: Activate pawns for both players
    activatePawnsForLinking();
    
    // Start linking
    if (typeof updateLinkingUI === 'function') {
        updateLinkingUI();
    }
    
    // Trigger AI linking if it's their turn
    if (gameState.currentPlayer === 2 && window.aiOpponent) {
        console.log('🤖 AI should link first - triggering AI linking');
        window.aiOpponent.performPawnLinking();
    } else {
        console.log('🎮 Player should link first');
    }
}

// Handle pawn linking
function handlePlayerLinking(data) {
    console.log('🔗 Handling pawn linking:', data);
    
    // Find the card index by cardId
    const pawn = getPawnById(data.pawnId);
    if (!pawn) {
        console.log('🔗 Pawn not found:', data.pawnId);
        return;
    }
    
    const player = gameState.players[pawn.player];
    const cardIndex = player.availableCards.findIndex(c => c.id === data.cardId);
    
    console.log('🔗 Pawn found:', pawn.id, 'Player:', pawn.player, 'Card index:', cardIndex);
    
    if (cardIndex >= 0) {
        // Link the pawn
        linkPawnToCard(data.pawnId, cardIndex);
        
        console.log('🔗 Pawn linked successfully. Current player:', gameState.currentPlayer);
        
        // Check if all pawns linked
        if (areAllPawnsLinked()) {
            console.log('🔗 All pawns linked - moving to action phase');
            // Move to action phase
            gameState.currentPhase = 'ACTION';
            gameState.currentPlayer = getDefiningPlayerForRound(gameState.cycleNumber);
            handlePlayerTurn();
            
            // AI goes first if needed
            if (gameState.currentPlayer === 2 && window.aiOpponent) {
                console.log('🤖 AI starting action phase');
                window.aiOpponent.performAction();
            }
        } else {
            console.log('🔗 Not all pawns linked yet - switching turns');
            // Switch turns for next linking
            const previousPlayer = gameState.currentPlayer;
            gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
            console.log('🔗 Switched from player', previousPlayer, 'to player', gameState.currentPlayer);
            
            if (typeof updateLinkingUI === 'function') {
                updateLinkingUI();
            }
            
            // Trigger AI if their turn
            if (gameState.currentPlayer === 2 && window.aiOpponent) {
                console.log('🤖 AI turn for linking - triggering AI');
                window.aiOpponent.performPawnLinking();
            } else {
                console.log('🎮 Player turn for linking');
            }
        }
    } else {
        console.log('🔗 Card not found for linking:', data.cardId);
    }
}

// AI linking handler
function handleOpponentPawnLinking(data) {
    if (!gameState.singleplayerMode) return;
    
    // Simulate the linking
    handlePlayerLinking(data);
}

// Handle player move
function handlePlayerMove(data) {
    const pawn = getPawnById(data.pawnId);
    if (pawn) {
        handleMoveAction(pawn, data.targetX, data.targetY);
        
        // Mark pawn as acted
        pawn.hasActed = true;
        
        // Check for victory
        if (checkVictoryCondition()) {
            return;
        }
        
        // AI turn if player is done
        if (areAllPawnsActed(1)) {
            endTurn();
        }
    }
}

// AI move handler
function handleOpponentMove(data) {
    if (!gameState.singleplayerMode) return;
    handlePlayerMove(data);
}

// Handle player attack
function handlePlayerAttack(data) {
    const attacker = getPawnById(data.pawnId);
    const target = getPawnById(data.targetPawnId);
    
    if (attacker && target) {
        handleAttackAction(attacker, target);
        
        // Mark as acted
        attacker.hasActed = true;
        
        // Check for victory
        if (checkVictoryCondition()) {
            return;
        }
        
        // AI turn if player is done
        if (areAllPawnsActed(1)) {
            endTurn();
        }
    }
}

// AI attack handler
function handleOpponentAttack(data) {
    if (!gameState.singleplayerMode) return;
    handlePlayerAttack(data);
}

// End turn
function handlePlayerEndTurn() {
    endTurn();
}

// Switch turns
function endTurn() {
    // Reset hasActed flags
    gameState.players[gameState.currentPlayer].pawns.forEach(p => p.hasActed = false);
    
    // Switch player
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    updateGameStatusUI();
    handlePlayerTurn();
    
    // Trigger AI if their turn
    if (gameState.currentPlayer === 2 && gameState.singleplayerMode) {
        window.aiOpponent.performAction();
    }
}

// RPS handlers
function handlePlayerRPSChoice(data) {
    gameState.playerRPSChoice = data.choice;
    
    // Trigger AI RPS
    if (gameState.singleplayerMode && !gameState.aiRPSChoice) {
        window.aiOpponent.performRPSTiebreaker();
    }
}

function handleOpponentRPSChoice(data) {
    if (!gameState.singleplayerMode) return;
    
    gameState.aiRPSChoice = data.choice;
    
    // Resolve RPS if both have chosen
    if (gameState.playerRPSChoice && gameState.aiRPSChoice) {
        resolveRPS(gameState.playerRPSChoice, gameState.aiRPSChoice);
        
        // Clear choices
        gameState.playerRPSChoice = null;
        gameState.aiRPSChoice = null;
    }
}

// Activate pawns for both players when starting linking phase
function activatePawnsForLinking() {
    console.log('🔗 Activating pawns for linking phase...');
    
    for (let player = 1; player <= 2; player++) {
        const playerPawns = gameState.players[player].pawns || [];
        let activatedCount = 0;
        
        playerPawns.forEach(pawn => {
            if (!pawn.isActive) {
                pawn.isActive = true;
                activatedCount++;
            }
        });
        
        console.log(`🔗 Player ${player}: ${activatedCount}/${playerPawns.length} pawns activated`);
    }
    
    // Log final status
    console.log('🔗 Final pawn status:');
    for (let player = 1; player <= 2; player++) {
        const allPawns = gameState.players[player].pawns || [];
        const activePawns = allPawns.filter(p => p.isActive);
        console.log(`🔗 Player ${player}: ${activePawns.length}/${allPawns.length} active pawns`);
    }
}

// Helper functions
function createAvailableCardsFromDefined() {
    console.log('🔗 Creating available cards from defined cards...');
    // Create card objects for both players
    for (let player = 1; player <= 2; player++) {
        gameState.players[player].availableCards = [];
        const definedCards = gameState.definedCards[player];
        
        console.log(`🔗 Player ${player} defined cards:`, definedCards);
        
        definedCards.forEach((card, index) => {
            const availableCard = {
                ...card,
                id: `${player}_card_${index}`, // Ensure cards have IDs
                index: index,
                linkedPawn: null
            };
            gameState.players[player].availableCards.push(availableCard);
        });
        
        console.log(`🔗 Player ${player} available cards:`, gameState.players[player].availableCards);
    }
}

function linkPawnToCard(pawnId, cardIndex) {
    const pawn = getPawnById(pawnId);
    const player = gameState.players[pawn.player];
    const card = player.availableCards[cardIndex];
    
    if (pawn && card && !pawn.card && !card.linkedPawn) {
        pawn.card = card;
        card.linkedPawn = pawn;
        
        // Update pawn visual representation
        if (typeof updatePawnDisplay === 'function') {
            updatePawnDisplay(pawn);
        } else {
            // Fallback: update pawn properties for display
            console.log('🔗 Linked pawn', pawnId, 'to card with stats:', {
                hp: card.hp,
                stamina: card.stamina,
                attack: card.attack
            });
            
            // Update pawn stats
            pawn.maxHP = card.hp;
            pawn.currentHP = card.hp;
            pawn.remainingStamina = card.stamina;
            pawn.attack = card.attack;
            pawn.isLinked = true;
        }
    }
}

function areAllPawnsLinked() {
    console.log('🔗 Checking if all pawns are linked...');
    for (let player = 1; player <= 2; player++) {
        const allPawns = gameState.players[player].pawns.filter(p => p.isActive);
        const unlinkedPawns = allPawns.filter(p => !p.card);
        console.log(`🔗 Player ${player}: ${allPawns.length} active pawns, ${unlinkedPawns.length} unlinked`);
        if (unlinkedPawns.length > 0) {
            console.log('🔗 Not all pawns linked yet');
            return false;
        }
    }
    console.log('🔗 All pawns are linked!');
    return true;
}

function areAllPawnsActed(playerNum) {
    const activePawns = gameState.players[playerNum].pawns.filter(p => p.isActive);
    return activePawns.every(p => p.hasActed);
}

function getPawnById(pawnId) {
    for (let player = 1; player <= 2; player++) {
        const pawn = gameState.players[player].pawns.find(p => p.id === pawnId);
        if (pawn) return pawn;
    }
    return null;
}

function getDefiningPlayerForRound(roundNumber) {
    // Odd rounds: Player 1 defines first
    // Even rounds: Player 2 defines first
    return roundNumber % 2 === 1 ? 1 : 2;
}

// Check victory conditions
function checkVictoryCondition() {
    // Check if any player has pawns in enemy havens
    const p1Pawns = gameState.players[1].pawns.filter(p => p.isActive);
    const p2Pawns = gameState.players[2].pawns.filter(p => p.isActive);
    
    // Check player 1 victory
    for (const pawn of p1Pawns) {
        if (ALL_TARGET_HAVENS_P2.some(h => h.x === pawn.gridX && h.y === pawn.gridY)) {
            declareVictory(1);
            return true;
        }
    }
    
    // Check player 2 victory
    for (const pawn of p2Pawns) {
        if (ALL_TARGET_HAVENS_P1.some(h => h.x === pawn.gridX && h.y === pawn.gridY)) {
            declareVictory(2);
            return true;
        }
    }
    
    return false;
}

function declareVictory(winner) {
    gameState.gameOver = true;
    gameState.winner = winner;
    
    // Show victory screen
    const gameOverDiv = document.getElementById('game-over');
    const winnerName = winner === 1 ? 'Player' : 'AI Commander';
    document.getElementById('winner-name').textContent = winnerName;
    gameOverDiv.style.display = 'block';
    
    // Play victory sound
    if (typeof soundManager !== 'undefined') {
        soundManager.playSound('ui_winner');
    }
}

// Missing UI functions for single player mode
function displayCardReveal(p1Cards, p2Cards) {
    // Use the existing updateRevealedCardsUI function
    if (typeof updateRevealedCardsUI === 'function') {
        const yourCards = gameState.playerNumber === 1 ? p1Cards : p2Cards;
        const oppCards = gameState.playerNumber === 1 ? p2Cards : p1Cards;
        
        // Calculate totals
        const p1Attack = p1Cards.reduce((sum, card) => sum + card.attack, 0);
        const p2Attack = p2Cards.reduce((sum, card) => sum + card.attack, 0);
        const p1Stamina = p1Cards.reduce((sum, card) => sum + (card.stamina || 0), 0);
        const p2Stamina = p2Cards.reduce((sum, card) => sum + (card.stamina || 0), 0);
        
        updateRevealedCardsUI(
            yourCards,
            oppCards,
            gameState.currentPlayer,
            p1Attack,
            p2Attack,
            p1Stamina,
            p2Stamina
        );
        
        // Show the reveal UI
        if (typeof showUIPanel === 'function') {
            showUIPanel('reveal');
        }
    }
}

function updateInitiativeDisplay(player, reason) {
    // Update initiative display
    const initiativePlayerSpan = document.getElementById('initiative-player');
    const initiativeReasonSpan = document.getElementById('initiative-reason');
    
    if (initiativePlayerSpan) {
        initiativePlayerSpan.textContent = player === 1 ? 'Player' : 'AI Commander';
    }
    if (initiativeReasonSpan) {
        initiativeReasonSpan.textContent = reason;
    }
    
    console.log(`Initiative: Player ${player} - ${reason}`);
}

function showRPSTiebreaker() {
    // Show RPS UI for tiebreaker
    if (typeof showUIPanel === 'function') {
        showUIPanel('rps');
    }
    gameState.currentPhase = 'RPS_TIEBREAKER';
}

function resolveRPS(playerChoice, aiChoice) {
    // Determine winner
    let winner;
    if (playerChoice === aiChoice) {
        // Tie - retry
        console.log('RPS Tie - retrying');
        setTimeout(() => {
            showRPSTiebreaker();
        }, 1500);
        return;
    } else if (
        (playerChoice === 'rock' && aiChoice === 'scissors') ||
        (playerChoice === 'paper' && aiChoice === 'rock') ||
        (playerChoice === 'scissors' && aiChoice === 'paper')
    ) {
        winner = 1;
    } else {
        winner = 2;
    }
    
    // Show result
    console.log(`RPS Result: Player chose ${playerChoice}, AI chose ${aiChoice}, Winner: Player ${winner}`);
    
    // Set initiative
    gameState.currentPlayer = winner;
    updateInitiativeDisplay(winner, `RPS Victory: ${playerChoice} beats ${aiChoice}`);
    
    // Move to linking phase after showing result
    setTimeout(() => {
        advanceToLinkingPhase();
    }, 2000);
}

// Initialize when needed
window.initSinglePlayerMode = initSinglePlayerMode;