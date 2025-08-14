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
            
            // Override the chooseAICardsByDifficulty function
            if (typeof window.chooseAICardsByDifficulty !== 'undefined') {
                const originalChooseCards = window.chooseAICardsByDifficulty;
                
                window.chooseAICardsByDifficulty = async function(playerCards) {
                    if (learningEnabled) {
                        try {
                            const cards = await module.generateAICards(playerCards);
                            console.log('[AI Patch] Using learning AI for card generation');
                            return cards.map((c, i) => ({ ...c, id: `ai_c${i}_${Date.now()}` }));
                        } catch (error) {
                            console.error('[AI Patch] Learning AI failed, falling back:', error);
                            return originalChooseCards(playerCards);
                        }
                    }
                    return originalChooseCards(playerCards);
                };
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