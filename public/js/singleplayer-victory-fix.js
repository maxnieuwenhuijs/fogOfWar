/**
 * Singleplayer Victory Detection Fix
 * Ensures player victories are properly logged and AI learns from losses
 */

(function() {
    console.log('[Victory Fix] Initializing victory detection patch...');
    
    // Track if we've already logged a game over to prevent duplicates
    let gameOverLogged = false;
    let currentSessionId = null;
    
    // Hook into the game state to detect victories
    function checkVictoryConditions() {
        if (typeof gameState === 'undefined' || !gameState) return;
        
        // Skip if game is already over or not in action phase
        if (gameState.currentPhase === 'GAME_OVER' || gameOverLogged) return;
        if (gameState.currentPhase !== 'ACTION') return;
        
        // Check for player victory (Player 1)
        const player1Victory = checkPlayerVictory(1);
        const player2Victory = checkPlayerVictory(2);
        
        if (player1Victory || player2Victory) {
            const winner = player1Victory ? 1 : 2;
            const reason = player1Victory ? 'Player reached AI haven' : 'AI reached player haven';
            
            logGameOver(winner, reason);
        }
        
        // Also check for elimination victories
        const player1Pawns = getActivePawns(1);
        const player2Pawns = getActivePawns(2);
        
        if (player1Pawns.length === 0 && player2Pawns.length === 0) {
            logGameOver(0, 'Mutual elimination - Draw');
        } else if (player1Pawns.length === 0) {
            logGameOver(2, 'Player pawns eliminated');
        } else if (player2Pawns.length === 0) {
            logGameOver(1, 'AI pawns eliminated');
        }
    }
    
    // Check if a player has reached opponent's haven
    function checkPlayerVictory(player) {
        const targetRow = player === 1 ? 0 : 10;
        const pawns = getActivePawns(player);
        
        return pawns.some(pawn => {
            if (!pawn || !pawn.gridY !== undefined) return false;
            return pawn.gridY === targetRow;
        });
    }
    
    // Get active pawns for a player
    function getActivePawns(player) {
        if (!gameState || !gameState.players || !gameState.players[player]) {
            return [];
        }
        
        const pawns = gameState.players[player].pawns || [];
        return pawns.filter(p => p && p.currentHP > 0);
    }
    
    // Log game over event
    function logGameOver(winner, reason) {
        if (gameOverLogged) return;
        gameOverLogged = true;
        
        console.log(`[Victory Fix] GAME OVER DETECTED - Winner: ${winner === 0 ? 'DRAW' : 'Player ' + winner}, Reason: ${reason}`);
        
        // Log to SpLogger
        try {
            if (window.SpLogger) {
                SpLogger.log('game.over', {
                    winner: winner,
                    reason: reason,
                    cycle: gameState.cycleNumber || 0,
                    round: gameState.roundNumber || 0,
                    timestamp: Date.now()
                });
                
                // End the session
                SpLogger.endSession({
                    winner: winner,
                    reason: reason
                });
            }
        } catch (error) {
            console.error('[Victory Fix] Error logging game over:', error);
        }
        
        // Trigger AI learning system
        try {
            if (window.endSingleplayerGame) {
                window.endSingleplayerGame(winner);
            }
        } catch (error) {
            console.error('[Victory Fix] Error triggering AI end game:', error);
        }
        
        // Update game state
        gameState.winner = winner;
        gameState.currentPhase = 'GAME_OVER';
        
        // Update UI
        if (typeof updateGameStatusUI === 'function') {
            updateGameStatusUI();
        }
        
        // Show victory message
        const message = winner === 1 ? 
            '🎉 Victory! You defeated the AI!' : 
            winner === 2 ? 
            '💀 Defeat! The AI has won!' :
            '🤝 Draw! No winner this time!';
            
        if (typeof showToast === 'function') {
            showToast(message, 10000);
        }
        
        console.log(`[Victory Fix] Game over logged successfully. Winner: ${winner}`);
    }
    
    // Hook into action performed to check after each action
    const originalActionPerformed = window.handleActionPerformed || function() {};
    window.handleActionPerformed = function(...args) {
        const result = originalActionPerformed.apply(this, args);
        
        // Check victory conditions after each action
        setTimeout(() => {
            checkVictoryConditions();
        }, 100);
        
        return result;
    };
    
    // Also hook into the socket dispatch for actionPerformed
    if (typeof socket !== 'undefined' && socket && socket.on) {
        const originalDispatch = socket._dispatch;
        socket._dispatch = function(eventName, data) {
            // Call original
            if (originalDispatch) {
                originalDispatch.call(this, eventName, data);
            }
            
            // Check victory after action events
            if (eventName === 'actionPerformed' || eventName === 'pawnEliminated') {
                setTimeout(() => {
                    checkVictoryConditions();
                }, 100);
            }
        };
    }
    
    // Reset on new game
    const originalStartGame = window.startSingleplayerGame || function() {};
    window.startSingleplayerGame = function(...args) {
        gameOverLogged = false;
        currentSessionId = `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('[Victory Fix] New game started, session:', currentSessionId);
        return originalStartGame.apply(this, args);
    };
    
    // Periodic check as backup (every 2 seconds during action phase)
    setInterval(() => {
        if (gameState && gameState.currentPhase === 'ACTION' && !gameOverLogged) {
            checkVictoryConditions();
        }
    }, 2000);
    
    console.log('[Victory Fix] Victory detection patch loaded successfully');
})();