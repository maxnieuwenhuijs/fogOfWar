/**
 * GameAnalytics - Manages game data storage, analysis, and learning persistence
 */
export class GameAnalytics {
    constructor() {
        this.dbName = 'FogOfWarAI';
        this.dbVersion = 1;
        this.db = null;
        this.learningData = {
            cardPatterns: {},
            movePatterns: {},
            winRates: {},
            lastUpdated: null
        };
        this.sessionCache = new Map();
    }

    /**
     * Initialize the analytics database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.loadLearningData().then(resolve).catch(reject);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('games')) {
                    const gameStore = db.createObjectStore('games', { 
                        keyPath: 'sessionId' 
                    });
                    gameStore.createIndex('difficulty', 'difficulty', { unique: false });
                    gameStore.createIndex('winner', 'winner', { unique: false });
                    gameStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('patterns')) {
                    const patternStore = db.createObjectStore('patterns', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    patternStore.createIndex('type', 'type', { unique: false });
                    patternStore.createIndex('difficulty', 'difficulty', { unique: false });
                }

                if (!db.objectStoreNames.contains('learning')) {
                    db.createObjectStore('learning', { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains('performance')) {
                    const perfStore = db.createObjectStore('performance', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    perfStore.createIndex('difficulty', 'difficulty', { unique: false });
                    perfStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * Store a game session
     */
    async storeGame(gameData) {
        if (!this.db) await this.init();

        const processedGame = {
            sessionId: gameData.sessionId,
            difficulty: this.extractDifficulty(gameData),
            winner: this.determineWinner(gameData),
            timestamp: gameData.events?.[0]?.ts || Date.now(),
            events: gameData.events || [],
            analysis: null
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games'], 'readwrite');
            const store = transaction.objectStore('games');
            const request = store.put(processedGame);

            request.onsuccess = () => {
                this.sessionCache.set(gameData.sessionId, processedGame);
                resolve(processedGame);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Retrieve games by criteria
     */
    async getGames(criteria = {}) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games'], 'readonly');
            const store = transaction.objectStore('games');
            
            let request;
            if (criteria.difficulty) {
                const index = store.index('difficulty');
                request = index.getAll(criteria.difficulty);
            } else if (criteria.winner) {
                const index = store.index('winner');
                request = index.getAll(criteria.winner);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => {
                let games = request.result;
                
                if (criteria.limit) {
                    games = games.slice(-criteria.limit);
                }
                
                if (criteria.minEvents) {
                    games = games.filter(g => g.events.length >= criteria.minEvents);
                }

                resolve(games);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Analyze and learn from stored games
     */
    async analyzeStoredGames(options = {}) {
        const { 
            difficulty = null, 
            limit = 100,
            minEvents = 50 
        } = options;

        const games = await this.getGames({ difficulty, limit, minEvents });
        
        const analysis = {
            totalGames: games.length,
            byDifficulty: {},
            patterns: {
                cards: new Map(),
                moves: new Map(),
                linking: new Map()
            },
            winRates: {}
        };

        games.forEach(game => {
            const diff = game.difficulty || 'unknown';
            
            if (!analysis.byDifficulty[diff]) {
                analysis.byDifficulty[diff] = {
                    total: 0,
                    wins: 0,
                    losses: 0,
                    avgDuration: 0,
                    patterns: []
                };
            }

            const diffStats = analysis.byDifficulty[diff];
            diffStats.total++;
            
            if (game.winner === 2) {
                diffStats.wins++;
            } else {
                diffStats.losses++;
            }

            this.extractPatterns(game, analysis.patterns);
        });

        for (const diff in analysis.byDifficulty) {
            const stats = analysis.byDifficulty[diff];
            stats.winRate = stats.total > 0 ? stats.wins / stats.total : 0;
        }

        await this.updateLearningData(analysis);
        
        return analysis;
    }

    /**
     * Extract patterns from a game
     */
    extractPatterns(game, patterns) {
        const cardEvents = game.events.filter(e => 
            e.event === 'action.decision' && 
            e.data?.type === 'defineCards'
        );

        cardEvents.forEach(event => {
            if (event.data.actor === 'AI') {
                const pattern = this.normalizeCardPattern(event.data.cards);
                const key = JSON.stringify(pattern);
                
                if (!patterns.cards.has(key)) {
                    patterns.cards.set(key, { 
                        pattern, 
                        wins: 0, 
                        losses: 0 
                    });
                }

                const p = patterns.cards.get(key);
                if (game.winner === 2) {
                    p.wins++;
                } else {
                    p.losses++;
                }
            }
        });

        const moveEvents = game.events.filter(e => 
            e.event === 'action.decision' && 
            e.data?.type === 'move'
        );

        this.analyzeMoveSequences(moveEvents, patterns.moves, game.winner);

        const linkEvents = game.events.filter(e => 
            e.event === 'link.decision'
        );

        this.analyzeLinkingPatterns(linkEvents, patterns.linking, game.winner);
    }

    /**
     * Normalize card pattern for comparison
     */
    normalizeCardPattern(cards) {
        return cards.map(c => ({
            hp: c.hp,
            stamina: c.stamina,
            attack: c.attack
        })).sort((a, b) => {
            const scoreA = a.hp * 100 + a.stamina * 10 + a.attack;
            const scoreB = b.hp * 100 + b.stamina * 10 + b.attack;
            return scoreB - scoreA;
        });
    }

    /**
     * Analyze move sequences
     */
    analyzeMoveSequences(moves, patterns, winner) {
        const sequences = [];
        let currentSequence = [];

        moves.forEach((move, index) => {
            if (move.data.actor === 'AI') {
                currentSequence.push({
                    type: move.data.moveType || 'standard',
                    distance: move.data.distance || 1
                });

                if (currentSequence.length >= 3 || index === moves.length - 1) {
                    const key = JSON.stringify(currentSequence);
                    
                    if (!patterns.has(key)) {
                        patterns.set(key, { 
                            sequence: currentSequence, 
                            wins: 0, 
                            losses: 0 
                        });
                    }

                    const p = patterns.get(key);
                    if (winner === 2) {
                        p.wins++;
                    } else {
                        p.losses++;
                    }

                    currentSequence = [];
                }
            }
        });
    }

    /**
     * Analyze linking patterns
     */
    analyzeLinkingPatterns(links, patterns, winner) {
        const aiLinks = links.filter(l => l.data.player === 2);
        
        aiLinks.forEach(link => {
            const pattern = {
                position: {
                    x: link.data.pawnPosition?.x,
                    y: link.data.pawnPosition?.y
                },
                stats: link.data.cardStats
            };

            const key = `${pattern.position.x}_${pattern.position.y}`;
            
            if (!patterns.has(key)) {
                patterns.set(key, { 
                    position: pattern.position,
                    uses: [],
                    wins: 0,
                    losses: 0
                });
            }

            const p = patterns.get(key);
            p.uses.push(pattern.stats);
            
            if (winner === 2) {
                p.wins++;
            } else {
                p.losses++;
            }
        });
    }

    /**
     * Update learning data
     */
    async updateLearningData(analysis) {
        this.learningData.cardPatterns = Object.fromEntries(analysis.patterns.cards);
        this.learningData.movePatterns = Object.fromEntries(analysis.patterns.moves);
        this.learningData.winRates = analysis.byDifficulty;
        this.learningData.lastUpdated = Date.now();

        await this.saveLearningData();
    }

    /**
     * Save learning data to IndexedDB
     */
    async saveLearningData() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['learning'], 'readwrite');
            const store = transaction.objectStore('learning');
            
            const data = {
                key: 'main',
                ...this.learningData
            };

            const request = store.put(data);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Load learning data from IndexedDB
     */
    async loadLearningData() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['learning'], 'readonly');
            const store = transaction.objectStore('learning');
            const request = store.get('main');

            request.onsuccess = () => {
                if (request.result) {
                    this.learningData = request.result;
                }
                resolve(this.learningData);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Track performance metrics
     */
    async trackPerformance(metrics) {
        if (!this.db) await this.init();

        const performance = {
            timestamp: Date.now(),
            difficulty: metrics.difficulty,
            winRate: metrics.winRate,
            avgGameDuration: metrics.avgGameDuration,
            avgMovesPerGame: metrics.avgMovesPerGame,
            adaptations: metrics.adaptations || []
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['performance'], 'readwrite');
            const store = transaction.objectStore('performance');
            const request = store.add(performance);

            request.onsuccess = () => resolve(performance);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get performance history
     */
    async getPerformanceHistory(difficulty = null, limit = 50) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['performance'], 'readonly');
            const store = transaction.objectStore('performance');
            
            let request;
            if (difficulty) {
                const index = store.index('difficulty');
                request = index.getAll(difficulty);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => {
                let results = request.result;
                results.sort((a, b) => b.timestamp - a.timestamp);
                
                if (limit) {
                    results = results.slice(0, limit);
                }
                
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Calculate adaptive difficulty adjustments
     */
    async calculateDifficultyAdjustments(targetWinRate = 0.5, difficulty = 'medium') {
        const recentGames = await this.getGames({ 
            difficulty, 
            limit: 20,
            minEvents: 50 
        });

        if (recentGames.length < 5) {
            return { 
                needsAdjustment: false,
                reason: 'Insufficient data'
            };
        }

        const wins = recentGames.filter(g => g.winner === 1).length;
        const playerWinRate = wins / recentGames.length;

        const adjustments = {
            needsAdjustment: Math.abs(playerWinRate - targetWinRate) > 0.15,
            currentWinRate: playerWinRate,
            targetWinRate,
            suggestions: []
        };

        if (playerWinRate < targetWinRate - 0.15) {
            adjustments.suggestions.push('Increase randomness in AI decisions');
            adjustments.suggestions.push('Reduce AI attack aggression');
            adjustments.suggestions.push('Add more delays to AI turns');
        } else if (playerWinRate > targetWinRate + 0.15) {
            adjustments.suggestions.push('Decrease randomness in AI decisions');
            adjustments.suggestions.push('Increase AI attack priority');
            adjustments.suggestions.push('Improve AI target selection');
        }

        return adjustments;
    }

    /**
     * Export analytics data
     */
    async exportData() {
        const games = await this.getGames();
        const performance = await this.getPerformanceHistory();
        
        return {
            games: games.map(g => ({
                sessionId: g.sessionId,
                difficulty: g.difficulty,
                winner: g.winner,
                eventCount: g.events.length,
                timestamp: g.timestamp
            })),
            learningData: this.learningData,
            performance,
            exportDate: new Date().toISOString()
        };
    }

    /**
     * Import analytics data
     */
    async importData(data) {
        if (data.learningData) {
            this.learningData = data.learningData;
            await this.saveLearningData();
        }

        if (data.games) {
            for (const game of data.games) {
                await this.storeGame(game);
            }
        }

        return {
            imported: true,
            gamesImported: data.games?.length || 0,
            learningDataUpdated: !!data.learningData
        };
    }

    /**
     * Clear old data
     */
    async clearOldData(daysToKeep = 30) {
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        const games = await this.getGames();
        
        let deleted = 0;
        
        for (const game of games) {
            if (game.timestamp < cutoffTime) {
                await this.deleteGame(game.sessionId);
                deleted++;
            }
        }

        return { deleted, remaining: games.length - deleted };
    }

    /**
     * Delete a game
     */
    async deleteGame(sessionId) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games'], 'readwrite');
            const store = transaction.objectStore('games');
            const request = store.delete(sessionId);

            request.onsuccess = () => {
                this.sessionCache.delete(sessionId);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
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
     * Determine winner from game data
     */
    determineWinner(gameData) {
        const gameOverEvent = gameData.events?.find(e => 
            e.event === 'game.over'
        );
        return gameOverEvent?.data?.winner || 0;
    }
}