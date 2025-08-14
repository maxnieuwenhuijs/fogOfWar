/**
 * PatternAnalyzer - Analyzes gameplay patterns and extracts insights
 */
export class PatternAnalyzer {
    constructor() {
        this.linkingPatterns = new Map();
        this.moveSequences = new Map();
        this.winConditions = new Map();
        this.openingBook = new Map();
        this.endgamePatterns = new Map();
    }

    /**
     * Analyze a complete game session
     */
    analyzeGame(gameData) {
        const analysis = {
            sessionId: gameData.sessionId,
            difficulty: this.extractDifficulty(gameData),
            winner: gameData.winner,
            duration: this.calculateDuration(gameData),
            patterns: {}
        };

        analysis.patterns.cardStrategy = this.analyzeCardStrategy(gameData);
        analysis.patterns.linking = this.analyzeLinkingPatterns(gameData);
        analysis.patterns.movement = this.analyzeMovementPatterns(gameData);
        analysis.patterns.combat = this.analyzeCombatPatterns(gameData);
        analysis.patterns.opening = this.analyzeOpeningMoves(gameData);
        analysis.patterns.endgame = this.analyzeEndgame(gameData);

        this.updatePatternDatabase(analysis);

        return analysis;
    }

    /**
     * Batch analyze multiple games
     */
    batchAnalyze(games) {
        const results = {
            totalGames: games.length,
            patterns: {},
            insights: []
        };

        games.forEach(game => {
            const analysis = this.analyzeGame(game);
            this.aggregatePatterns(results.patterns, analysis.patterns);
        });

        results.insights = this.extractInsights(results.patterns);
        return results;
    }

    /**
     * Extract difficulty from game data
     */
    extractDifficulty(gameData) {
        const metaEvent = gameData.events?.find(e => 
            e.event === 'session.meta' && e.data?.difficulty
        );
        return metaEvent?.data?.difficulty || 'unknown';
    }

    /**
     * Calculate game duration
     */
    calculateDuration(gameData) {
        if (!gameData.events || gameData.events.length < 2) return 0;
        
        const firstEvent = gameData.events[0];
        const lastEvent = gameData.events[gameData.events.length - 1];
        
        return (lastEvent.ts - firstEvent.ts) / 1000;
    }

    /**
     * Analyze card strategy patterns
     */
    analyzeCardStrategy(gameData) {
        const cardEvents = gameData.events?.filter(e => 
            e.event === 'define.cards' || 
            e.event === 'cards.revealed'
        ) || [];

        const patterns = {
            playerStrategy: null,
            aiStrategy: null,
            initiativeWinner: null,
            statDistribution: {}
        };

        cardEvents.forEach(event => {
            if (event.event === 'cards.revealed') {
                patterns.initiativeWinner = event.data.initiativePlayer;
                
                patterns.statDistribution.player1 = {
                    totalHP: event.data.player1Cards?.reduce((sum, c) => sum + c.hp, 0) || 0,
                    totalStamina: event.data.p1TotalStamina || 0,
                    totalAttack: event.data.p1TotalAttack || 0
                };

                patterns.statDistribution.player2 = {
                    totalHP: event.data.player2Cards?.reduce((sum, c) => sum + c.hp, 0) || 0,
                    totalStamina: event.data.p2TotalStamina || 0,
                    totalAttack: event.data.p2TotalAttack || 0
                };
            }
        });

        const aiDecisions = gameData.events?.filter(e => 
            e.event === 'action.decision' && 
            e.data?.actor === 'AI' &&
            e.data?.type === 'defineCards'
        ) || [];

        if (aiDecisions.length > 0) {
            patterns.aiStrategy = this.classifyCardStrategy(aiDecisions[0].data.cards);
        }

        return patterns;
    }

    /**
     * Analyze linking patterns
     */
    analyzeLinkingPatterns(gameData) {
        const linkEvents = gameData.events?.filter(e => 
            e.event === 'link.decision' || e.event === 'link.applied'
        ) || [];

        const patterns = {
            positions: [],
            timing: [],
            strategy: null
        };

        linkEvents.forEach(event => {
            if (event.data?.pawnPosition) {
                patterns.positions.push({
                    player: event.data.player,
                    position: event.data.pawnPosition,
                    stats: event.data.cardStats,
                    round: event.data.round || 1
                });
            }
        });

        patterns.strategy = this.classifyLinkingStrategy(patterns.positions);

        const key = `${gameData.difficulty}_${patterns.strategy}`;
        if (!this.linkingPatterns.has(key)) {
            this.linkingPatterns.set(key, { wins: 0, losses: 0, positions: [] });
        }

        const pattern = this.linkingPatterns.get(key);
        if (gameData.winner === 2) {
            pattern.wins++;
        } else {
            pattern.losses++;
        }
        pattern.positions.push(...patterns.positions);

        return patterns;
    }

    /**
     * Analyze movement patterns
     */
    analyzeMovementPatterns(gameData) {
        const moveEvents = gameData.events?.filter(e => 
            e.event === 'move.pawn' || 
            (e.event === 'action.decision' && e.data?.type === 'move')
        ) || [];

        const patterns = {
            moveTypes: [],
            averageDistance: 0,
            directionBias: { forward: 0, backward: 0, lateral: 0 },
            aggressiveness: 0
        };

        let totalDistance = 0;
        let moveCount = 0;

        moveEvents.forEach(event => {
            if (event.data?.from && event.data?.to) {
                const distance = Math.abs(event.data.to.x - event.data.from.x) + 
                               Math.abs(event.data.to.y - event.data.from.y);
                
                totalDistance += distance;
                moveCount++;

                const direction = this.classifyMoveDirection(
                    event.data.from, 
                    event.data.to, 
                    event.data.player
                );
                patterns.directionBias[direction]++;
            }
        });

        if (moveCount > 0) {
            patterns.averageDistance = totalDistance / moveCount;
            patterns.aggressiveness = patterns.directionBias.forward / moveCount;
        }

        return patterns;
    }

    /**
     * Analyze combat patterns
     */
    analyzeCombatPatterns(gameData) {
        const attackEvents = gameData.events?.filter(e => 
            e.event === 'attack' || 
            e.event === 'physics.attack' ||
            (e.event === 'action.decision' && e.data?.type === 'attack')
        ) || [];

        const patterns = {
            totalAttacks: attackEvents.length,
            attackTiming: [],
            targetSelection: [],
            effectiveness: 0
        };

        let successfulAttacks = 0;

        attackEvents.forEach(event => {
            if (event.data?.damage && event.data.damage > 0) {
                successfulAttacks++;
            }

            if (event.data?.target) {
                patterns.targetSelection.push({
                    targetHP: event.data.target.hp,
                    targetPosition: event.data.target.position,
                    attackerPosition: event.data.attacker?.position
                });
            }

            patterns.attackTiming.push({
                cycle: event.data?.cycle || 0,
                turn: event.data?.turn || 0
            });
        });

        if (attackEvents.length > 0) {
            patterns.effectiveness = successfulAttacks / attackEvents.length;
        }

        return patterns;
    }

    /**
     * Analyze opening moves
     */
    analyzeOpeningMoves(gameData) {
        const earlyEvents = gameData.events?.slice(0, 50) || [];
        
        const opening = {
            firstMoves: [],
            cardChoices: [],
            linkingOrder: []
        };

        earlyEvents.forEach(event => {
            if (event.event === 'action.decision' && opening.firstMoves.length < 3) {
                opening.firstMoves.push({
                    type: event.data.type,
                    actor: event.data.actor,
                    details: event.data
                });
            }

            if (event.event === 'link.decision') {
                opening.linkingOrder.push({
                    player: event.data.player,
                    position: event.data.pawnPosition,
                    stats: event.data.cardStats
                });
            }
        });

        const openingKey = this.generateOpeningKey(opening);
        if (!this.openingBook.has(openingKey)) {
            this.openingBook.set(openingKey, { 
                wins: 0, 
                losses: 0, 
                games: [] 
            });
        }

        const book = this.openingBook.get(openingKey);
        if (gameData.winner === 2) {
            book.wins++;
        } else {
            book.losses++;
        }
        book.games.push(gameData.sessionId);

        return opening;
    }

    /**
     * Analyze endgame patterns
     */
    analyzeEndgame(gameData) {
        const lastEvents = gameData.events?.slice(-30) || [];
        
        const endgame = {
            winCondition: null,
            finalPositions: [],
            decisiveMoves: []
        };

        const gameOverEvent = lastEvents.find(e => e.event === 'game.over');
        if (gameOverEvent) {
            endgame.winCondition = gameOverEvent.data?.reason || 'unknown';
        }

        const lastSnapshot = lastEvents.reverse().find(e => 
            e.event === 'board.snapshot'
        );
        
        if (lastSnapshot) {
            endgame.finalPositions = this.extractActivePawns(lastSnapshot.data);
        }

        return endgame;
    }

    /**
     * Classify card strategy type
     */
    classifyCardStrategy(cards) {
        if (!cards || cards.length === 0) return 'unknown';

        const totals = cards.reduce((acc, card) => ({
            hp: acc.hp + card.hp,
            stamina: acc.stamina + card.stamina,
            attack: acc.attack + card.attack
        }), { hp: 0, stamina: 0, attack: 0 });

        const total = totals.hp + totals.stamina + totals.attack;

        if (totals.hp / total > 0.4) return 'defensive';
        if (totals.stamina / total > 0.4) return 'mobile';
        if (totals.attack / total > 0.4) return 'aggressive';
        return 'balanced';
    }

    /**
     * Classify linking strategy
     */
    classifyLinkingStrategy(positions) {
        if (!positions || positions.length === 0) return 'unknown';

        const avgY = positions.reduce((sum, p) => sum + p.position.y, 0) / positions.length;
        const centerDistance = positions.reduce((sum, p) => 
            sum + Math.abs(p.position.x - 5), 0
        ) / positions.length;

        if (avgY <= 1 || avgY >= 9) return 'frontline';
        if (centerDistance < 2) return 'central';
        if (centerDistance > 3) return 'flanking';
        return 'distributed';
    }

    /**
     * Classify move direction
     */
    classifyMoveDirection(from, to, player) {
        const yDiff = to.y - from.y;
        const xDiff = Math.abs(to.x - from.x);

        if (player === 1) {
            if (yDiff < 0) return 'forward';
            if (yDiff > 0) return 'backward';
        } else {
            if (yDiff > 0) return 'forward';
            if (yDiff < 0) return 'backward';
        }

        return 'lateral';
    }

    /**
     * Extract active pawns from board snapshot
     */
    extractActivePawns(snapshot) {
        const active = [];

        ['p1', 'p2'].forEach(player => {
            if (snapshot[player]) {
                snapshot[player].forEach(pawn => {
                    if (pawn.act && pawn.hp > 0) {
                        active.push({
                            id: pawn.id,
                            player: pawn.pl,
                            position: { x: pawn.x, y: pawn.y },
                            hp: pawn.hp,
                            stamina: pawn.rs
                        });
                    }
                });
            }
        });

        return active;
    }

    /**
     * Generate opening key for pattern matching
     */
    generateOpeningKey(opening) {
        const moves = opening.firstMoves.map(m => m.type).join('-');
        const links = opening.linkingOrder.map(l => 
            `${l.position.x},${l.position.y}`
        ).join('-');
        
        return `${moves}_${links}`;
    }

    /**
     * Update pattern database with new analysis
     */
    updatePatternDatabase(analysis) {
        const won = analysis.winner === 2;

        for (const [category, patterns] of Object.entries(analysis.patterns)) {
            const key = `${category}_${analysis.difficulty}`;
            
            if (!this.winConditions.has(key)) {
                this.winConditions.set(key, { wins: 0, losses: 0, patterns: [] });
            }

            const condition = this.winConditions.get(key);
            if (won) {
                condition.wins++;
            } else {
                condition.losses++;
            }
            condition.patterns.push(patterns);
        }
    }

    /**
     * Aggregate patterns from multiple analyses
     */
    aggregatePatterns(target, source) {
        for (const [key, value] of Object.entries(source)) {
            if (!target[key]) {
                target[key] = [];
            }
            target[key].push(value);
        }
    }

    /**
     * Extract insights from aggregated patterns
     */
    extractInsights(patterns) {
        const insights = [];

        if (patterns.cardStrategy) {
            const strategies = patterns.cardStrategy.map(p => p.aiStrategy);
            const mostCommon = this.getMostFrequent(strategies);
            insights.push({
                type: 'card_preference',
                value: mostCommon,
                frequency: strategies.filter(s => s === mostCommon).length / strategies.length
            });
        }

        if (patterns.linking) {
            const linkStrategies = patterns.linking.map(p => p.strategy);
            const mostCommon = this.getMostFrequent(linkStrategies);
            insights.push({
                type: 'linking_preference',
                value: mostCommon,
                frequency: linkStrategies.filter(s => s === mostCommon).length / linkStrategies.length
            });
        }

        if (patterns.movement) {
            const avgAggression = patterns.movement.reduce((sum, p) => 
                sum + p.aggressiveness, 0
            ) / patterns.movement.length;
            
            insights.push({
                type: 'movement_aggression',
                value: avgAggression,
                interpretation: avgAggression > 0.6 ? 'aggressive' : 
                              avgAggression > 0.4 ? 'balanced' : 'defensive'
            });
        }

        return insights;
    }

    /**
     * Get most frequent element in array
     */
    getMostFrequent(arr) {
        const frequency = {};
        let maxFreq = 0;
        let mostFrequent = null;

        arr.forEach(item => {
            frequency[item] = (frequency[item] || 0) + 1;
            if (frequency[item] > maxFreq) {
                maxFreq = frequency[item];
                mostFrequent = item;
            }
        });

        return mostFrequent;
    }

    /**
     * Get successful patterns for a difficulty
     */
    getSuccessfulPatterns(difficulty, minGames = 5) {
        const successful = [];

        this.winConditions.forEach((data, key) => {
            if (key.includes(difficulty)) {
                const total = data.wins + data.losses;
                const winRate = data.wins / total;

                if (total >= minGames && winRate > 0.6) {
                    successful.push({
                        pattern: key,
                        winRate,
                        games: total,
                        data: data.patterns
                    });
                }
            }
        });

        return successful.sort((a, b) => b.winRate - a.winRate);
    }

    /**
     * Export pattern data
     */
    exportData() {
        return {
            linkingPatterns: Array.from(this.linkingPatterns.entries()),
            moveSequences: Array.from(this.moveSequences.entries()),
            winConditions: Array.from(this.winConditions.entries()),
            openingBook: Array.from(this.openingBook.entries()),
            endgamePatterns: Array.from(this.endgamePatterns.entries())
        };
    }

    /**
     * Import pattern data
     */
    importData(data) {
        if (data.linkingPatterns) {
            this.linkingPatterns = new Map(data.linkingPatterns);
        }
        if (data.moveSequences) {
            this.moveSequences = new Map(data.moveSequences);
        }
        if (data.winConditions) {
            this.winConditions = new Map(data.winConditions);
        }
        if (data.openingBook) {
            this.openingBook = new Map(data.openingBook);
        }
        if (data.endgamePatterns) {
            this.endgamePatterns = new Map(data.endgamePatterns);
        }
    }
}