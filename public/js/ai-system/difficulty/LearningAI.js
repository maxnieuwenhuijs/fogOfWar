/**
 * LearningAI - Integrates all AI learning components with difficulty levels
 */
import { CardStrategyLearner } from '../models/CardStrategyLearner.js';
import { MoveEvaluator } from '../models/MoveEvaluator.js';
import { PatternAnalyzer } from '../models/PatternAnalyzer.js';
import { GameAnalytics } from '../storage/GameAnalytics.js';

export class LearningAI {
    constructor() {
        this.cardLearner = new CardStrategyLearner();
        this.moveEvaluator = new MoveEvaluator();
        this.patternAnalyzer = new PatternAnalyzer();
        this.analytics = new GameAnalytics();
        
        this.initialized = false;
        this.difficulty = 'medium';
        this.learningEnabled = true;
        this.historicalData = null;
        this.currentGameData = {
            sessionId: null,
            events: [],
            startTime: null
        };
    }

    /**
     * Initialize the learning system
     */
    async init() {
        if (this.initialized) return;

        try {
            await this.analytics.init();
            await this.loadHistoricalData();
            
            this.initialized = true;
            console.log('[LearningAI] Initialized successfully');
        } catch (error) {
            console.error('[LearningAI] Initialization failed:', error);
            this.learningEnabled = false;
        }
    }

    /**
     * Load and analyze historical game data
     */
    async loadHistoricalData() {
        try {
            const games = await this.analytics.getGames({ 
                limit: 100,
                minEvents: 50 
            });

            if (games.length > 0) {
                this.historicalData = await this.analytics.analyzeStoredGames();
                
                if (this.historicalData.patterns.cards.size > 0) {
                    const cardData = await this.analytics.loadLearningData();
                    this.cardLearner.importData({
                        patterns: new Map(Object.entries(cardData.cardPatterns || {})),
                        winRates: new Map(Object.entries(cardData.winRates || {}))
                    });
                }

                console.log(`[LearningAI] Loaded ${games.length} historical games`);
            }
        } catch (error) {
            console.error('[LearningAI] Failed to load historical data:', error);
        }
    }

    /**
     * Set difficulty level
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        console.log(`[LearningAI] Difficulty set to ${difficulty}`);
    }

    /**
     * Start a new game session
     */
    startGame(sessionId) {
        this.currentGameData = {
            sessionId,
            events: [],
            startTime: Date.now()
        };
    }

    /**
     * Log a game event
     */
    logEvent(event) {
        if (this.currentGameData.sessionId) {
            this.currentGameData.events.push({
                ...event,
                ts: Date.now()
            });
        }
    }

    /**
     * Generate AI cards based on difficulty and learning
     */
    async generateCards(playerCards = null) {
        if (!this.initialized) await this.init();

        const cards = this.cardLearner.generateCards(
            this.difficulty,
            playerCards,
            this.historicalData
        );

        this.logEvent({
            event: 'action.decision',
            data: {
                actor: 'AI',
                type: 'defineCards',
                difficulty: this.difficulty,
                cards
            }
        });

        return cards;
    }

    /**
     * Choose the best move for a pawn
     */
    async chooseMove(pawn, gameState) {
        if (!this.initialized) await this.init();

        const possibleMoves = this.getPossibleMoves(pawn, gameState);
        
        if (possibleMoves.length === 0) {
            return null;
        }

        if (this.difficulty === 'easy' && Math.random() < 0.3) {
            const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            
            this.logEvent({
                event: 'action.decision',
                data: {
                    actor: 'AI',
                    type: 'move',
                    difficulty: this.difficulty,
                    pawnId: pawn.id,
                    from: pawn.position,
                    to: randomMove,
                    reason: 'random'
                }
            });

            return randomMove;
        }

        const evaluations = possibleMoves.map(move => 
            this.moveEvaluator.evaluateMove(pawn, move, gameState, this.difficulty)
        );

        evaluations.sort((a, b) => b.totalScore - a.totalScore);
        
        const bestMove = evaluations[0];

        this.logEvent({
            event: 'action.decision',
            data: {
                actor: 'AI',
                type: 'move',
                difficulty: this.difficulty,
                pawnId: pawn.id,
                from: pawn.position,
                to: bestMove.position,
                score: bestMove.totalScore,
                moveType: bestMove.moveType
            }
        });

        return bestMove.position;
    }

    /**
     * Decide whether to attack
     */
    async chooseAttack(attacker, targets, gameState) {
        if (!this.initialized) await this.init();

        if (!targets || targets.length === 0) {
            return null;
        }

        if (this.difficulty === 'easy' && Math.random() < 0.5) {
            return null;
        }

        const evaluations = targets.map(target => ({
            target,
            ...this.moveEvaluator.evaluateAttack(attacker, target, gameState, this.difficulty)
        }));

        const validAttacks = evaluations.filter(e => e.shouldAttack);
        
        if (validAttacks.length === 0) {
            return null;
        }

        validAttacks.sort((a, b) => b.netValue - a.netValue);
        
        const bestAttack = validAttacks[0];

        this.logEvent({
            event: 'action.decision',
            data: {
                actor: 'AI',
                type: 'attack',
                difficulty: this.difficulty,
                attackerId: attacker.id,
                targetId: bestAttack.target.id,
                scores: bestAttack.scores,
                netValue: bestAttack.netValue
            }
        });

        return bestAttack.target;
    }

    /**
     * Choose pawn for linking
     */
    async chooseLinkTarget(card, availablePawns, gameState) {
        if (!this.initialized) await this.init();

        if (!availablePawns || availablePawns.length === 0) {
            return null;
        }

        const positions = {
            frontline: availablePawns.filter(p => p.position.y <= 1),
            middle: availablePawns.filter(p => p.position.y > 1 && p.position.y < 3),
            back: availablePawns.filter(p => p.position.y >= 3)
        };

        let targetPawn = null;

        if (this.difficulty === 'easy') {
            targetPawn = availablePawns[Math.floor(Math.random() * availablePawns.length)];
        } else {
            const cardType = this.classifyCard(card);
            
            switch (cardType) {
                case 'tank':
                    targetPawn = positions.frontline[0] || 
                                positions.middle[0] || 
                                availablePawns[0];
                    break;
                case 'runner':
                    const flankPawns = availablePawns.filter(p => 
                        p.position.x <= 1 || p.position.x >= 9
                    );
                    targetPawn = flankPawns[0] || availablePawns[0];
                    break;
                case 'striker':
                    targetPawn = positions.middle[0] || 
                                positions.frontline[0] || 
                                availablePawns[0];
                    break;
                default:
                    targetPawn = availablePawns[Math.floor(availablePawns.length / 2)];
            }
        }

        this.logEvent({
            event: 'link.decision',
            data: {
                player: 2,
                cardStats: card,
                pawnPosition: targetPawn.position,
                pawnId: targetPawn.id
            }
        });

        return targetPawn;
    }

    /**
     * Get possible moves for a pawn
     */
    getPossibleMoves(pawn, gameState) {
        const moves = [];
        const maxDistance = pawn.stamina || 1;

        for (let dx = -maxDistance; dx <= maxDistance; dx++) {
            for (let dy = -maxDistance; dy <= maxDistance; dy++) {
                if (Math.abs(dx) + Math.abs(dy) > maxDistance) continue;
                
                const newX = pawn.position.x + dx;
                const newY = pawn.position.y + dy;

                if (newX < 0 || newX > 10 || newY < 0 || newY > 10) continue;

                if (dx === 0 && dy === 0) continue;

                const targetPos = { x: newX, y: newY };
                
                if (!this.isOccupied(targetPos, gameState)) {
                    moves.push(targetPos);
                }
            }
        }

        return moves;
    }

    /**
     * Check if position is occupied
     */
    isOccupied(pos, gameState) {
        return gameState.pawns?.some(p => 
            p.position && 
            p.position.x === pos.x && 
            p.position.y === pos.y &&
            p.active
        ) || false;
    }

    /**
     * Classify card type
     */
    classifyCard(card) {
        const total = card.hp + card.stamina + card.attack;
        const ratios = {
            hp: card.hp / total,
            stamina: card.stamina / total,
            attack: card.attack / total
        };

        if (ratios.hp > 0.5) return 'tank';
        if (ratios.stamina > 0.5) return 'runner';
        if (ratios.attack > 0.5) return 'striker';
        return 'balanced';
    }

    /**
     * End game and save analysis
     */
    async endGame(winner) {
        if (!this.currentGameData.sessionId) return;

        this.currentGameData.winner = winner;

        if (this.learningEnabled && this.currentGameData.events.length > 10) {
            try {
                await this.analytics.storeGame(this.currentGameData);
                
                const analysis = this.patternAnalyzer.analyzeGame(this.currentGameData);
                
                const performance = {
                    difficulty: this.difficulty,
                    winRate: winner === 1 ? 0 : 1,
                    avgGameDuration: (Date.now() - this.currentGameData.startTime) / 1000,
                    avgMovesPerGame: this.currentGameData.events.filter(e => 
                        e.event === 'action.decision'
                    ).length
                };
                
                await this.analytics.trackPerformance(performance);
                
                const adjustments = await this.analytics.calculateDifficultyAdjustments(
                    this.getTargetWinRate(), 
                    this.difficulty
                );
                
                if (adjustments.needsAdjustment) {
                    this.moveEvaluator.updateWeights(this.difficulty, {
                        winRate: adjustments.currentWinRate
                    });
                }

                console.log('[LearningAI] Game analysis saved', analysis);
            } catch (error) {
                console.error('[LearningAI] Failed to save game analysis:', error);
            }
        }

        this.currentGameData = {
            sessionId: null,
            events: [],
            startTime: null
        };
    }

    /**
     * Get target win rate for difficulty
     */
    getTargetWinRate() {
        switch (this.difficulty) {
            case 'easy': return 0.25;
            case 'medium': return 0.5;
            case 'hard': return 0.75;
            default: return 0.5;
        }
    }

    /**
     * Export learning data
     */
    async exportLearningData() {
        const data = {
            cardPatterns: this.cardLearner.exportData(),
            moveWeights: this.moveEvaluator.weights,
            patternData: this.patternAnalyzer.exportData(),
            analytics: await this.analytics.exportData()
        };

        return data;
    }

    /**
     * Import learning data
     */
    async importLearningData(data) {
        if (data.cardPatterns) {
            this.cardLearner.importData(data.cardPatterns);
        }
        
        if (data.moveWeights) {
            this.moveEvaluator.weights = data.moveWeights;
        }
        
        if (data.patternData) {
            this.patternAnalyzer.importData(data.patternData);
        }
        
        if (data.analytics) {
            await this.analytics.importData(data.analytics);
        }
    }
}