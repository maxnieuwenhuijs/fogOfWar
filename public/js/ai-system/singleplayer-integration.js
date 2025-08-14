/**
 * Singleplayer AI Integration Module
 * Bridges the learning AI system with the existing singleplayer implementation
 */

import { LearningAI } from './difficulty/LearningAI.js';

// Global instance
let learningAI = null;

/**
 * Initialize the learning AI system
 */
export async function initLearningAI() {
    if (!learningAI) {
        learningAI = new LearningAI();
        await learningAI.init();
        
        const difficulty = localStorage.getItem('sp_difficulty') || 'medium';
        learningAI.setDifficulty(difficulty);
        
        console.log('[AI Integration] Learning AI initialized with difficulty:', difficulty);
    }
    return learningAI;
}

/**
 * Get or create the learning AI instance
 */
export function getLearningAI() {
    if (!learningAI) {
        console.warn('[AI Integration] Learning AI not initialized, creating new instance');
        learningAI = new LearningAI();
    }
    return learningAI;
}

/**
 * Enhanced card generation using learning system
 */
export async function generateAICards(playerCards = null, difficulty = null) {
    const ai = await initLearningAI();
    
    if (difficulty) {
        ai.setDifficulty(difficulty);
    }
    
    try {
        const cards = await ai.generateCards(playerCards);
        console.log('[AI Integration] Generated cards:', cards);
        return cards;
    } catch (error) {
        console.error('[AI Integration] Failed to generate cards:', error);
        
        return getFallbackCards(difficulty || ai.difficulty);
    }
}

/**
 * Enhanced move selection using learning system
 */
export async function chooseAIMove(pawn, gameState) {
    const ai = await initLearningAI();
    
    try {
        const move = await ai.chooseMove(pawn, gameState);
        console.log('[AI Integration] Chose move:', move);
        return move;
    } catch (error) {
        console.error('[AI Integration] Failed to choose move:', error);
        
        return getFallbackMove(pawn, gameState, ai.difficulty);
    }
}

/**
 * Enhanced attack decision using learning system
 */
export async function chooseAIAttack(attacker, targets, gameState) {
    const ai = await initLearningAI();
    
    try {
        const target = await ai.chooseAttack(attacker, targets, gameState);
        console.log('[AI Integration] Chose attack target:', target);
        return target;
    } catch (error) {
        console.error('[AI Integration] Failed to choose attack:', error);
        
        return getFallbackAttack(targets, ai.difficulty);
    }
}

/**
 * Enhanced linking decision using learning system
 */
export async function chooseAILinkTarget(card, availablePawns, gameState) {
    const ai = await initLearningAI();
    
    try {
        const pawn = await ai.chooseLinkTarget(card, availablePawns, gameState);
        console.log('[AI Integration] Chose link target:', pawn);
        return pawn;
    } catch (error) {
        console.error('[AI Integration] Failed to choose link target:', error);
        
        return availablePawns[Math.floor(Math.random() * availablePawns.length)];
    }
}

/**
 * Start a new game session
 */
export function startAIGame(sessionId) {
    const ai = getLearningAI();
    ai.startGame(sessionId);
    console.log('[AI Integration] Started game session:', sessionId);
}

/**
 * End game and trigger learning
 */
export async function endAIGame(winner) {
    const ai = getLearningAI();
    await ai.endGame(winner);
    console.log('[AI Integration] Ended game, winner:', winner);
}

/**
 * Log game event for learning
 */
export function logAIEvent(event) {
    const ai = getLearningAI();
    ai.logEvent(event);
}

/**
 * Update difficulty setting
 */
export function setAIDifficulty(difficulty) {
    const ai = getLearningAI();
    ai.setDifficulty(difficulty);
    localStorage.setItem('sp_difficulty', difficulty);
    console.log('[AI Integration] Difficulty updated to:', difficulty);
}

/**
 * Get current difficulty
 */
export function getAIDifficulty() {
    const ai = getLearningAI();
    return ai.difficulty;
}

/**
 * Fallback card generation (when learning system fails)
 */
function getFallbackCards(difficulty) {
    const presets = {
        easy: [
            { hp: 3, stamina: 2, attack: 2 },
            { hp: 2, stamina: 3, attack: 2 },
            { hp: 2, stamina: 2, attack: 3 }
        ],
        medium: [
            { hp: 2, stamina: 2, attack: 3 },
            { hp: 2, stamina: 1, attack: 4 },
            { hp: 1, stamina: 2, attack: 4 }
        ],
        hard: [
            { hp: 1, stamina: 1, attack: 5 },
            { hp: 2, stamina: 1, attack: 4 },
            { hp: 1, stamina: 2, attack: 4 }
        ]
    };

    return presets[difficulty] || presets.medium;
}

/**
 * Fallback move selection
 */
function getFallbackMove(pawn, gameState, difficulty) {
    const possibleMoves = [];
    const maxDistance = pawn.stamina || 1;

    for (let dx = -maxDistance; dx <= maxDistance; dx++) {
        for (let dy = -maxDistance; dy <= maxDistance; dy++) {
            if (Math.abs(dx) + Math.abs(dy) > maxDistance) continue;
            
            const newX = pawn.position.x + dx;
            const newY = pawn.position.y + dy;

            if (newX < 0 || newX > 10 || newY < 0 || newY > 10) continue;
            if (dx === 0 && dy === 0) continue;

            const targetPos = { x: newX, y: newY };
            
            const occupied = gameState.pawns?.some(p => 
                p.position && 
                p.position.x === targetPos.x && 
                p.position.y === targetPos.y &&
                p.active
            );

            if (!occupied) {
                possibleMoves.push(targetPos);
            }
        }
    }

    if (possibleMoves.length === 0) return null;

    if (difficulty === 'easy' || Math.random() < 0.3) {
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    const forwardMoves = possibleMoves.filter(m => 
        pawn.player === 2 ? m.y > pawn.position.y : m.y < pawn.position.y
    );

    if (forwardMoves.length > 0) {
        return forwardMoves[Math.floor(Math.random() * forwardMoves.length)];
    }

    return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
}

/**
 * Fallback attack selection
 */
function getFallbackAttack(targets, difficulty) {
    if (!targets || targets.length === 0) return null;

    if (difficulty === 'easy' && Math.random() < 0.5) {
        return null;
    }

    const weakTargets = targets.filter(t => t.hp <= 1);
    if (weakTargets.length > 0) {
        return weakTargets[0];
    }

    return targets[Math.floor(Math.random() * targets.length)];
}

/**
 * Export learning data for analysis
 */
export async function exportAILearningData() {
    const ai = getLearningAI();
    return await ai.exportLearningData();
}

/**
 * Import learning data
 */
export async function importAILearningData(data) {
    const ai = await initLearningAI();
    return await ai.importLearningData(data);
}

/**
 * Get performance statistics
 */
export async function getAIPerformanceStats() {
    const ai = await initLearningAI();
    
    try {
        const stats = {
            difficulty: ai.difficulty,
            targetWinRate: ai.getTargetWinRate(),
            learningEnabled: ai.learningEnabled,
            historicalGames: 0
        };

        if (ai.analytics && ai.analytics.db) {
            const games = await ai.analytics.getGames({ limit: 100 });
            stats.historicalGames = games.length;
            
            const recentGames = games.slice(-20);
            const aiWins = recentGames.filter(g => g.winner === 2).length;
            stats.recentWinRate = recentGames.length > 0 ? aiWins / recentGames.length : 0;
        }

        return stats;
    } catch (error) {
        console.error('[AI Integration] Failed to get performance stats:', error);
        return null;
    }
}

/**
 * Clear learning data
 */
export async function clearAILearningData(daysToKeep = 0) {
    const ai = await initLearningAI();
    
    try {
        if (daysToKeep === 0) {
            const games = await ai.analytics.getGames();
            for (const game of games) {
                await ai.analytics.deleteGame(game.sessionId);
            }
            console.log('[AI Integration] Cleared all learning data');
        } else {
            const result = await ai.analytics.clearOldData(daysToKeep);
            console.log('[AI Integration] Cleared old data:', result);
        }
    } catch (error) {
        console.error('[AI Integration] Failed to clear learning data:', error);
    }
}

// Auto-initialize on module load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initLearningAI().catch(console.error);
    });
}