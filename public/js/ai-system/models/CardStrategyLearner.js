/**
 * CardStrategyLearner - Analyzes historical games to learn successful card patterns
 */
export class CardStrategyLearner {
    constructor() {
        this.patterns = new Map();
        this.winRates = new Map();
        this.counterStrategies = new Map();
    }

    /**
     * Analyze historical games to find successful patterns
     */
    analyzeCardPatterns(gameHistory) {
        const patterns = {
            winning: [],
            losing: []
        };

        gameHistory.forEach(game => {
            const cards = this.extractCardData(game);
            const outcome = game.winner;
            
            if (!cards) return;

            const pattern = this.normalizeCardPattern(cards);
            const key = this.patternToKey(pattern);

            if (outcome === 2) {
                patterns.winning.push(pattern);
                this.updateWinRate(key, true);
            } else {
                patterns.losing.push(pattern);
                this.updateWinRate(key, false);
            }

            this.analyzeCounterStrategy(game);
        });

        this.updatePatternWeights(patterns);
        return patterns;
    }

    /**
     * Extract card data from game events
     */
    extractCardData(game) {
        const cardEvents = game.events.filter(e => 
            e.event === 'action.decision' && 
            e.data.actor === 'AI' && 
            e.data.type === 'defineCards'
        );

        if (cardEvents.length === 0) return null;

        return cardEvents.flatMap(e => e.data.cards);
    }

    /**
     * Normalize card pattern for comparison
     */
    normalizeCardPattern(cards) {
        const sorted = cards.sort((a, b) => {
            const scoreA = a.hp * 3 + a.stamina * 2 + a.attack;
            const scoreB = b.hp * 3 + b.stamina * 2 + b.attack;
            return scoreB - scoreA;
        });

        return sorted.map(c => ({
            hp: c.hp,
            stamina: c.stamina,
            attack: c.attack,
            type: this.classifyCardType(c)
        }));
    }

    /**
     * Classify card archetype
     */
    classifyCardType(card) {
        const total = card.hp + card.stamina + card.attack;
        const ratios = {
            hp: card.hp / total,
            stamina: card.stamina / total,
            attack: card.attack / total
        };

        if (ratios.hp > 0.5) return 'tank';
        if (ratios.stamina > 0.5) return 'runner';
        if (ratios.attack > 0.5) return 'striker';
        if (ratios.hp > 0.3 && ratios.stamina > 0.3) return 'balanced';
        return 'specialist';
    }

    /**
     * Generate cards based on difficulty and learning
     */
    generateCards(difficulty, opponentCards = null, historicalData = null) {
        switch (difficulty) {
            case 'easy':
                return this.getRandomPreset();
            case 'medium':
                return opponentCards ? 
                    this.getCounterStrategy(opponentCards) : 
                    this.getBalancedStrategy();
            case 'hard':
                return this.getOptimalStrategy(opponentCards, historicalData);
            default:
                return this.getBalancedStrategy();
        }
    }

    /**
     * Get random preset for easy mode
     */
    getRandomPreset() {
        const presets = [
            [
                { hp: 3, stamina: 2, attack: 2 },
                { hp: 2, stamina: 3, attack: 2 },
                { hp: 2, stamina: 2, attack: 3 }
            ],
            [
                { hp: 4, stamina: 1, attack: 2 },
                { hp: 1, stamina: 4, attack: 2 },
                { hp: 2, stamina: 2, attack: 3 }
            ],
            [
                { hp: 2, stamina: 2, attack: 3 },
                { hp: 2, stamina: 3, attack: 2 },
                { hp: 3, stamina: 2, attack: 2 }
            ]
        ];

        return presets[Math.floor(Math.random() * presets.length)];
    }

    /**
     * Generate counter strategy for medium mode
     */
    getCounterStrategy(opponentCards) {
        if (!opponentCards || opponentCards.length === 0) {
            return this.getBalancedStrategy();
        }

        const opponentProfile = this.analyzeOpponentProfile(opponentCards);
        
        if (opponentProfile.highStamina) {
            return [
                { hp: 3, stamina: 1, attack: 3 },
                { hp: 2, stamina: 2, attack: 3 },
                { hp: 2, stamina: 1, attack: 4 }
            ];
        }

        if (opponentProfile.highAttack) {
            return [
                { hp: 4, stamina: 2, attack: 1 },
                { hp: 3, stamina: 3, attack: 1 },
                { hp: 2, stamina: 2, attack: 3 }
            ];
        }

        if (opponentProfile.highHP) {
            return [
                { hp: 1, stamina: 2, attack: 4 },
                { hp: 2, stamina: 2, attack: 3 },
                { hp: 1, stamina: 3, attack: 3 }
            ];
        }

        return this.getBalancedStrategy();
    }

    /**
     * Get optimal strategy using learned patterns
     */
    getOptimalStrategy(opponentCards, historicalData) {
        const topPatterns = this.getTopWinningPatterns(5);
        
        if (topPatterns.length > 0 && Math.random() < 0.7) {
            const pattern = topPatterns[Math.floor(Math.random() * Math.min(3, topPatterns.length))];
            return this.patternToCards(pattern);
        }

        if (opponentCards) {
            const counter = this.getLearnedCounterStrategy(opponentCards);
            if (counter) return counter;
        }

        return [
            { hp: 2, stamina: 1, attack: 4 },
            { hp: 1, stamina: 2, attack: 4 },
            { hp: 3, stamina: 2, attack: 2 }
        ];
    }

    /**
     * Get balanced strategy for fallback
     */
    getBalancedStrategy() {
        return [
            { hp: 3, stamina: 2, attack: 2 },
            { hp: 2, stamina: 3, attack: 2 },
            { hp: 2, stamina: 2, attack: 3 }
        ];
    }

    /**
     * Analyze opponent's card profile
     */
    analyzeOpponentProfile(cards) {
        const totals = cards.reduce((acc, card) => ({
            hp: acc.hp + card.hp,
            stamina: acc.stamina + card.stamina,
            attack: acc.attack + card.attack
        }), { hp: 0, stamina: 0, attack: 0 });

        const total = totals.hp + totals.stamina + totals.attack;

        return {
            highHP: totals.hp / total > 0.4,
            highStamina: totals.stamina / total > 0.4,
            highAttack: totals.attack / total > 0.4,
            balanced: Math.abs(totals.hp - totals.stamina) < 3 && 
                     Math.abs(totals.stamina - totals.attack) < 3
        };
    }

    /**
     * Update win rate for a pattern
     */
    updateWinRate(patternKey, won) {
        if (!this.winRates.has(patternKey)) {
            this.winRates.set(patternKey, { wins: 0, losses: 0 });
        }

        const rate = this.winRates.get(patternKey);
        if (won) {
            rate.wins++;
        } else {
            rate.losses++;
        }
    }

    /**
     * Get top winning patterns
     */
    getTopWinningPatterns(count = 5) {
        const patterns = Array.from(this.patterns.entries())
            .map(([key, pattern]) => {
                const rate = this.winRates.get(key) || { wins: 0, losses: 0 };
                const total = rate.wins + rate.losses;
                const winRate = total > 0 ? rate.wins / total : 0;
                
                return {
                    pattern,
                    winRate,
                    games: total,
                    score: winRate * Math.log(total + 1)
                };
            })
            .filter(p => p.games >= 3)
            .sort((a, b) => b.score - a.score)
            .slice(0, count);

        return patterns.map(p => p.pattern);
    }

    /**
     * Convert pattern to card array
     */
    patternToCards(pattern) {
        return pattern.map(p => ({
            hp: p.hp,
            stamina: p.stamina,
            attack: p.attack
        }));
    }

    /**
     * Convert pattern to string key
     */
    patternToKey(pattern) {
        return pattern.map(p => `${p.hp}-${p.stamina}-${p.attack}`).join('_');
    }

    /**
     * Analyze counter strategies from games
     */
    analyzeCounterStrategy(game) {
        const events = game.events;
        const p1Cards = events.find(e => 
            e.event === 'cards.revealed'
        )?.data?.player1Cards;

        const p2Cards = events.find(e => 
            e.event === 'cards.revealed'  
        )?.data?.player2Cards;

        if (!p1Cards || !p2Cards) return;

        const p1Key = this.patternToKey(this.normalizeCardPattern(p1Cards));
        const winner = game.winner;

        if (!this.counterStrategies.has(p1Key)) {
            this.counterStrategies.set(p1Key, []);
        }

        this.counterStrategies.get(p1Key).push({
            cards: p2Cards,
            won: winner === 2
        });
    }

    /**
     * Get learned counter strategy
     */
    getLearnedCounterStrategy(opponentCards) {
        const key = this.patternToKey(this.normalizeCardPattern(opponentCards));
        const counters = this.counterStrategies.get(key);

        if (!counters || counters.length === 0) return null;

        const winning = counters.filter(c => c.won);
        if (winning.length > 0) {
            const counter = winning[Math.floor(Math.random() * winning.length)];
            return counter.cards.map(c => ({
                hp: c.hp,
                stamina: c.stamina,
                attack: c.attack
            }));
        }

        return null;
    }

    /**
     * Update pattern weights based on analysis
     */
    updatePatternWeights(patterns) {
        patterns.winning.forEach(pattern => {
            const key = this.patternToKey(pattern);
            this.patterns.set(key, pattern);
        });
    }

    /**
     * Export learned data for persistence
     */
    exportData() {
        return {
            patterns: Array.from(this.patterns.entries()),
            winRates: Array.from(this.winRates.entries()),
            counterStrategies: Array.from(this.counterStrategies.entries())
        };
    }

    /**
     * Import learned data
     */
    importData(data) {
        if (data.patterns) {
            this.patterns = new Map(data.patterns);
        }
        if (data.winRates) {
            this.winRates = new Map(data.winRates);
        }
        if (data.counterStrategies) {
            this.counterStrategies = new Map(data.counterStrategies);
        }
    }
}