/**
 * Analyze existing game logs and train the AI
 * This script processes JSONL files and updates the AI's learning data
 */

import { CardStrategyLearner } from './models/CardStrategyLearner.js';
import { PatternAnalyzer } from './models/PatternAnalyzer.js';
import { GameAnalytics } from './storage/GameAnalytics.js';

export async function analyzeAndLearnFromLogs() {
    console.log('[AI Learning] Starting analysis of game logs...');
    
    const analytics = new GameAnalytics();
    const cardLearner = new CardStrategyLearner();
    const patternAnalyzer = new PatternAnalyzer();
    
    await analytics.init();
    
    // List of log files to process
    const logFiles = [
        'sp_1755107967406_iock69rs8b.jsonl',
        'sp_1755112064661_otzhiice1ad.jsonl',
        'sp_1755165389800_2w6pzd709dw.jsonl',
        'sp_1755176344993_xexawfwlrv.jsonl',
        'sp_1755176390376_h4jxytkhz2.jsonl',
        'sp_1755178108977_stkwf0taswc.jsonl',
        'sp_1755178194151_6px19yj5aik.jsonl',
        'sp_1755178478267_yorib0g6hn.jsonl'
    ];
    
    const processedGames = [];
    let totalEvents = 0;
    
    // Process each log file
    for (const filename of logFiles) {
        try {
            const response = await fetch(`/logs/singleplayer/${filename}`);
            const text = await response.text();
            const lines = text.trim().split('\n').filter(line => line);
            
            if (lines.length < 10) {
                console.log(`[AI Learning] Skipping ${filename} - too few events (${lines.length})`);
                continue;
            }
            
            const events = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            }).filter(e => e !== null);
            
            const gameData = {
                sessionId: filename.replace('.jsonl', ''),
                events: events,
                winner: determineWinner(events),
                difficulty: extractDifficulty(events)
            };
            
            processedGames.push(gameData);
            totalEvents += events.length;
            
            console.log(`[AI Learning] Processed ${filename}: ${events.length} events, winner: ${gameData.winner}, difficulty: ${gameData.difficulty}`);
            
            // Store in analytics database
            await analytics.storeGame(gameData);
            
        } catch (error) {
            console.error(`[AI Learning] Failed to process ${filename}:`, error);
        }
    }
    
    console.log(`[AI Learning] Processed ${processedGames.length} games with ${totalEvents} total events`);
    
    // Analyze patterns
    const patterns = analyzePatterns(processedGames);
    
    // Extract key insights
    const insights = {
        totalGames: processedGames.length,
        difficulties: {},
        commonCardPatterns: [],
        playerStrategies: [],
        aiWinRate: 0
    };
    
    // Calculate win rates by difficulty
    const byDifficulty = {};
    processedGames.forEach(game => {
        const diff = game.difficulty || 'unknown';
        if (!byDifficulty[diff]) {
            byDifficulty[diff] = { total: 0, aiWins: 0, playerWins: 0 };
        }
        byDifficulty[diff].total++;
        if (game.winner === 2) {
            byDifficulty[diff].aiWins++;
        } else if (game.winner === 1) {
            byDifficulty[diff].playerWins++;
        }
    });
    
    for (const [diff, stats] of Object.entries(byDifficulty)) {
        insights.difficulties[diff] = {
            games: stats.total,
            aiWinRate: stats.total > 0 ? (stats.aiWins / stats.total * 100).toFixed(1) + '%' : '0%',
            playerWinRate: stats.total > 0 ? (stats.playerWins / stats.total * 100).toFixed(1) + '%' : '0%'
        };
    }
    
    // Find common player card patterns
    const playerPatterns = {};
    processedGames.forEach(game => {
        const defineEvents = game.events.filter(e => 
            e.event === 'define.cards' && e.data?.cards
        );
        
        defineEvents.forEach(event => {
            const pattern = summarizeCardPattern(event.data.cards);
            if (!playerPatterns[pattern]) {
                playerPatterns[pattern] = { count: 0, wins: 0 };
            }
            playerPatterns[pattern].count++;
            if (game.winner === 1) {
                playerPatterns[pattern].wins++;
            }
        });
    });
    
    // Sort patterns by usage
    insights.commonCardPatterns = Object.entries(playerPatterns)
        .map(([pattern, stats]) => ({
            pattern,
            usage: stats.count,
            winRate: (stats.wins / stats.count * 100).toFixed(1) + '%'
        }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);
    
    // Identify player strategies
    insights.playerStrategies = identifyStrategies(processedGames);
    
    // Calculate overall AI win rate
    const totalAIWins = processedGames.filter(g => g.winner === 2).length;
    insights.aiWinRate = (totalAIWins / processedGames.length * 100).toFixed(1) + '%';
    
    // Update learning models
    console.log('[AI Learning] Updating AI models with insights...');
    cardLearner.analyzeCardPatterns(processedGames);
    
    // Save insights
    await analytics.updateLearningData({
        patterns: {
            cards: new Map(Object.entries(playerPatterns)),
            moves: new Map(),
            linking: new Map()
        },
        byDifficulty
    });
    
    console.log('[AI Learning] Analysis complete!');
    console.log('[AI Learning] Insights:', insights);
    
    return insights;
}

function determineWinner(events) {
    // Check for explicit game over event
    const gameOverEvent = events.find(e => e.event === 'game.over');
    if (gameOverEvent && gameOverEvent.data?.winner !== undefined) {
        console.log('[AI Learning] Found game.over event, winner:', gameOverEvent.data.winner);
        return gameOverEvent.data.winner;
    }
    
    // Check for client-side game over
    const clientGameOver = events.find(e => e.event === 'game.over.client');
    if (clientGameOver && clientGameOver.data?.winner !== undefined) {
        console.log('[AI Learning] Found game.over.client event, winner:', clientGameOver.data.winner);
        return clientGameOver.data.winner;
    }
    
    // Check session end event
    const sessionEnd = events.find(e => e.event === 'session.end');
    if (sessionEnd && sessionEnd.data?.winner !== undefined) {
        console.log('[AI Learning] Found session.end event, winner:', sessionEnd.data.winner);
        return sessionEnd.data.winner;
    }
    
    // Try to infer from haven reach events
    const havenEvents = events.filter(e => 
        e.event === 'pawn.reached.haven' || 
        e.event === 'victory' ||
        (e.event === 'move.pawn' && e.data?.to?.y === 0) || // Player 1 reached top
        (e.event === 'move.pawn' && e.data?.to?.y === 10) // Player 2 reached bottom
    );
    
    if (havenEvents.length > 0) {
        const lastHaven = havenEvents[havenEvents.length - 1];
        const player = lastHaven.data?.player || (lastHaven.data?.to?.y === 0 ? 1 : 2);
        console.log('[AI Learning] Inferred winner from haven reach:', player);
        return player;
    }
    
    // Try to infer from elimination
    const boardSnapshots = events.filter(e => e.event === 'board.snapshot');
    if (boardSnapshots.length > 0) {
        const lastSnapshot = boardSnapshots[boardSnapshots.length - 1];
        if (lastSnapshot.data) {
            const p1ActivePawns = (lastSnapshot.data.p1 || []).filter(p => p.act && p.hp > 0).length;
            const p2ActivePawns = (lastSnapshot.data.p2 || []).filter(p => p.act && p.hp > 0).length;
            
            if (p1ActivePawns === 0 && p2ActivePawns > 0) {
                console.log('[AI Learning] Inferred winner from elimination: Player 2 (AI)');
                return 2;
            } else if (p2ActivePawns === 0 && p1ActivePawns > 0) {
                console.log('[AI Learning] Inferred winner from elimination: Player 1');
                return 1;
            }
        }
    }
    
    console.log('[AI Learning] Could not determine winner for game');
    return 0; // Unknown
}

function extractDifficulty(events) {
    const metaEvent = events.find(e => 
        e.event === 'session.meta' && e.data?.difficulty
    );
    return metaEvent?.data?.difficulty || 'medium';
}

function summarizeCardPattern(cards) {
    if (!cards || cards.length === 0) return 'unknown';
    
    const totals = cards.reduce((acc, card) => ({
        hp: acc.hp + (card.hp || 0),
        stamina: acc.stamina + (card.stamina || 0),
        attack: acc.attack + (card.attack || 0)
    }), { hp: 0, stamina: 0, attack: 0 });
    
    const total = totals.hp + totals.stamina + totals.attack;
    
    if (totals.stamina / total > 0.5) return 'speedy';
    if (totals.hp / total > 0.4) return 'tanky';
    if (totals.attack / total > 0.4) return 'aggressive';
    return 'balanced';
}

function identifyStrategies(games) {
    const strategies = {
        'speedy_preset': 0,
        'tanky_preset': 0,
        'aggressive_preset': 0,
        'quick_games': 0,
        'long_games': 0
    };
    
    games.forEach(game => {
        // Check for speedy preset (1-5-1 pattern)
        const speedyPattern = game.events.some(e => 
            e.event === 'define.cards' && 
            e.data?.cards?.some(c => c.hp === 1 && c.stamina === 5 && c.attack === 1)
        );
        
        if (speedyPattern) strategies.speedy_preset++;
        
        // Check game length
        if (game.events.length < 500) {
            strategies.quick_games++;
        } else if (game.events.length > 1000) {
            strategies.long_games++;
        }
    });
    
    return Object.entries(strategies)
        .filter(([_, count]) => count > 0)
        .map(([name, count]) => ({
            strategy: name.replace('_', ' '),
            frequency: count
        }))
        .sort((a, b) => b.frequency - a.frequency);
}

function analyzePatterns(games) {
    const patterns = {
        openings: {},
        cardCombos: {},
        winningMoves: []
    };
    
    games.forEach(game => {
        // Analyze first few moves
        const firstMoves = game.events.slice(0, 20).filter(e => 
            e.event === 'action.decision' || 
            e.event === 'link.decision'
        );
        
        if (firstMoves.length > 0) {
            const openingKey = firstMoves.map(m => m.event).join('-');
            if (!patterns.openings[openingKey]) {
                patterns.openings[openingKey] = { count: 0, wins: 0 };
            }
            patterns.openings[openingKey].count++;
            if (game.winner === 2) {
                patterns.openings[openingKey].wins++;
            }
        }
    });
    
    return patterns;
}

// Auto-run analysis when module loads
if (typeof window !== 'undefined') {
    window.analyzeGameLogs = analyzeAndLearnFromLogs;
    
    // Add to test panel
    window.runFullAnalysis = async function() {
        const results = await analyzeAndLearnFromLogs();
        console.log('[AI Learning] Full analysis results:', results);
        return results;
    };
}