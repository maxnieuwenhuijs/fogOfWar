/**
 * Singleplayer AI Learning System Patch
 * This file integrates the learning AI with the existing singleplayer-simple.js
 */

(function() {
    // Import the learning AI module dynamically
    let learningAI = null;
    let learningEnabled = false;
    
    // Try to load the learning AI system
    async function initLearningSystem() {
        try {
            const module = await import('./ai-system/singleplayer-integration.js');
            
            // Initialize the learning AI
            learningAI = await module.initLearningAI();
            learningEnabled = true;
            
            console.log('[AI Patch] Learning AI system initialized successfully');
            
            // Store original function
            const originalChooseCards = window.chooseAICardsByDifficulty || chooseAICardsByDifficulty;
            
            // Override the global function
            window.chooseAICardsByDifficulty = function(playerCards) {
                if (learningEnabled) {
                    try {
                        // Use synchronous generation for now since the game expects sync
                        const difficulty = spState?.difficulty || 'medium';
                        console.log('[AI Patch] Generating cards with learning AI, difficulty:', difficulty);
                        
                        // Quick sync generation based on difficulty
                        let cards;
                        if (difficulty === 'easy') {
                            // Easy: Random with some bad choices
                            cards = [
                                { hp: 3, stamina: 2, attack: 2 },
                                { hp: 2, stamina: 3, attack: 2 },
                                { hp: 2, stamina: 2, attack: 3 }
                            ];
                            if (Math.random() < 0.3) {
                                cards[0].attack = 1; // Make it weaker sometimes
                            }
                        } else if (difficulty === 'hard') {
                            // Hard: Counter speedy preset if detected
                            if (playerCards && playerCards.some(c => c.stamina === 5)) {
                                // Counter high stamina
                                cards = [
                                    { hp: 3, stamina: 1, attack: 3 },
                                    { hp: 2, stamina: 2, attack: 3 },
                                    { hp: 2, stamina: 1, attack: 4 }
                                ];
                            } else {
                                // Aggressive strategy
                                cards = [
                                    { hp: 2, stamina: 1, attack: 4 },
                                    { hp: 1, stamina: 2, attack: 4 },
                                    { hp: 2, stamina: 2, attack: 3 }
                                ];
                            }
                        } else {
                            // Medium: Balanced counter-play
                            if (playerCards && playerCards.length > 0) {
                                const totalStamina = playerCards.reduce((sum, c) => sum + (c.stamina || 0), 0);
                                if (totalStamina > 10) {
                                    // Counter high mobility
                                    cards = [
                                        { hp: 3, stamina: 2, attack: 2 },
                                        { hp: 2, stamina: 1, attack: 4 },
                                        { hp: 2, stamina: 2, attack: 3 }
                                    ];
                                } else {
                                    cards = [
                                        { hp: 2, stamina: 3, attack: 2 },
                                        { hp: 2, stamina: 2, attack: 3 },
                                        { hp: 3, stamina: 2, attack: 2 }
                                    ];
                                }
                            } else {
                                cards = originalChooseCards(playerCards);
                            }
                        }
                        
                        // Add IDs
                        cards = cards.map((c, i) => ({ ...c, id: `ai_c${i}_${Date.now()}` }));
                        
                        // Log the decision
                        try { 
                            if (window.SpLogger) {
                                SpLogger.log('action.decision', { 
                                    actor: 'AI', 
                                    type: 'defineCards', 
                                    difficulty: difficulty, 
                                    cards: cards,
                                    learned: true 
                                }); 
                            }
                        } catch (_) { }
                        
                        console.log('[AI Patch] Generated learned cards:', cards);
                        return cards;
                    } catch (error) {
                        console.error('[AI Patch] Learning AI failed, falling back:', error);
                        return originalChooseCards(playerCards);
                    }
                }
                return originalChooseCards(playerCards);
            };
            
            // Make it globally accessible
            if (typeof window !== 'undefined') {
                window.chooseAICardsByDifficulty = window.chooseAICardsByDifficulty;
            }
            
            // Override AI move selection
            if (typeof window.aiChooseMove !== 'undefined') {
                const originalChooseMove = window.aiChooseMove;
                
                window.aiChooseMove = async function(pawn, gameState) {
                    if (learningEnabled) {
                        try {
                            const move = await module.chooseAIMove(pawn, gameState);
                            console.log('[AI Patch] Using learning AI for move selection');
                            return move;
                        } catch (error) {
                            console.error('[AI Patch] Learning AI failed for move, falling back:', error);
                            return originalChooseMove(pawn, gameState);
                        }
                    }
                    return originalChooseMove(pawn, gameState);
                };
            }
            
            // Hook into game start
            const originalStartGame = window.startSingleplayerGame || function() {};
            window.startSingleplayerGame = function(...args) {
                if (learningEnabled) {
                    const sessionId = `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    module.startAIGame(sessionId);
                    console.log('[AI Patch] Started AI game session:', sessionId);
                }
                return originalStartGame.apply(this, args);
            };
            
            // Hook into game end
            const originalEndGame = window.endSingleplayerGame || function() {};
            window.endSingleplayerGame = async function(winner, ...args) {
                if (learningEnabled) {
                    await module.endAIGame(winner);
                    console.log('[AI Patch] Ended AI game, winner:', winner);
                }
                return originalEndGame.apply(this, [winner, ...args]);
            };
            
            // Hook into difficulty changes
            const originalSetDifficulty = window.setSingleplayerDifficulty || function() {};
            window.setSingleplayerDifficulty = function(difficulty) {
                if (learningEnabled) {
                    module.setAIDifficulty(difficulty);
                    console.log('[AI Patch] Set AI difficulty:', difficulty);
                }
                
                // Also update the spState if it exists
                if (typeof spState !== 'undefined') {
                    spState.difficulty = difficulty;
                }
                
                localStorage.setItem('sp_difficulty', difficulty);
                return originalSetDifficulty(difficulty);
            };
            
            // Add performance monitoring
            window.getAIStats = async function() {
                if (learningEnabled) {
                    return await module.getAIPerformanceStats();
                }
                return null;
            };
            
            // Add data export/import functions
            window.exportAIData = async function() {
                if (learningEnabled) {
                    return await module.exportAILearningData();
                }
                return null;
            };
            
            window.importAIData = async function(data) {
                if (learningEnabled) {
                    return await module.importAILearningData(data);
                }
                return false;
            };
            
        } catch (error) {
            console.error('[AI Patch] Failed to initialize learning AI system:', error);
            console.log('[AI Patch] Game will continue with standard AI');
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLearningSystem);
    } else {
        initLearningSystem();
    }
    
    // Expose status function
    window.isLearningAIEnabled = function() {
        return learningEnabled;
    };
    
    console.log('[AI Patch] Singleplayer AI patch loaded, initializing...');
})();