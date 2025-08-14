/**
 * MoveEvaluator - Evaluates and scores potential moves based on multiple factors
 */
export class MoveEvaluator {
    constructor() {
        this.weights = {
            easy: {
                havenDistance: 0.4,
                threatLevel: 0.1,
                attackOpportunity: 0.2,
                territoryControl: 0.1,
                pawnSafety: 0.1,
                randomness: 0.1
            },
            medium: {
                havenDistance: 0.3,
                threatLevel: 0.2,
                attackOpportunity: 0.25,
                territoryControl: 0.15,
                pawnSafety: 0.1,
                randomness: 0
            },
            hard: {
                havenDistance: 0.25,
                threatLevel: 0.2,
                attackOpportunity: 0.3,
                territoryControl: 0.15,
                pawnSafety: 0.1,
                randomness: 0
            }
        };

        this.cachedEvaluations = new Map();
    }

    /**
     * Evaluate a potential move
     */
    evaluateMove(pawn, targetPos, gameState, difficulty = 'medium') {
        const cacheKey = `${pawn.id}_${targetPos.x}_${targetPos.y}_${difficulty}`;
        
        if (this.cachedEvaluations.has(cacheKey)) {
            return this.cachedEvaluations.get(cacheKey);
        }

        const scores = {
            havenDistance: this.getHavenProximityScore(targetPos, pawn.player, gameState),
            threatLevel: this.getThreatScore(targetPos, pawn, gameState),
            attackOpportunity: this.getAttackPotential(targetPos, pawn, gameState),
            territoryControl: this.getControlScore(targetPos, pawn.player, gameState),
            pawnSafety: this.getPawnSafetyScore(targetPos, pawn, gameState),
            randomness: Math.random()
        };

        const weights = this.getDifficultyWeights(difficulty);
        const totalScore = this.calculateWeightedScore(scores, weights);

        const result = {
            position: targetPos,
            scores,
            totalScore,
            moveType: this.classifyMoveType(scores)
        };

        this.cachedEvaluations.set(cacheKey, result);
        
        if (this.cachedEvaluations.size > 1000) {
            const firstKey = this.cachedEvaluations.keys().next().value;
            this.cachedEvaluations.delete(firstKey);
        }

        return result;
    }

    /**
     * Evaluate an attack decision
     */
    evaluateAttack(attacker, target, gameState, difficulty = 'medium') {
        const damage = Math.min(attacker.attack || 1, target.hp);
        const counterDamage = this.calculateCounterDamage(target, attacker);
        const positionValue = this.getPositionValue(target.position, target.player, gameState);
        
        const riskTolerance = {
            easy: 0.8,
            medium: 0.5,
            hard: 0.3
        }[difficulty];

        const scores = {
            damageDealt: damage / (target.maxHp || target.hp),
            damageRisk: counterDamage / attacker.hp,
            targetValue: this.getTargetValue(target, gameState),
            positionGain: positionValue,
            killPotential: damage >= target.hp ? 1 : 0
        };

        const attackValue = (scores.damageDealt * 0.3) + 
                          (scores.targetValue * 0.25) +
                          (scores.killPotential * 0.3) +
                          (scores.positionGain * 0.15);

        const riskValue = scores.damageRisk * (1 - riskTolerance);

        return {
            shouldAttack: attackValue > riskValue,
            scores,
            netValue: attackValue - riskValue
        };
    }

    /**
     * Get score based on distance to enemy haven
     */
    getHavenProximityScore(pos, player, gameState) {
        const targetHaven = player === 1 ? 
            gameState.havens.player2 : 
            gameState.havens.player1;

        if (!targetHaven || targetHaven.length === 0) {
            const defaultTarget = player === 1 ? 0 : 10;
            const distance = Math.abs(defaultTarget - pos.y);
            return 1 - (distance / 10);
        }

        const minDistance = Math.min(...targetHaven.map(haven => 
            Math.abs(haven.x - pos.x) + Math.abs(haven.y - pos.y)
        ));

        return 1 - (minDistance / 20);
    }

    /**
     * Get threat score for a position
     */
    getThreatScore(pos, pawn, gameState) {
        const enemies = this.getEnemyPawns(pawn.player, gameState);
        let threatLevel = 0;

        enemies.forEach(enemy => {
            if (!enemy.position || !enemy.active) return;

            const distance = Math.abs(enemy.position.x - pos.x) + 
                           Math.abs(enemy.position.y - pos.y);

            if (distance <= (enemy.stamina || 1)) {
                const threatPower = (enemy.attack || 1) / (pawn.hp || 1);
                const distanceFactor = 1 - (distance / 10);
                threatLevel += threatPower * distanceFactor;
            }
        });

        return 1 - Math.min(threatLevel, 1);
    }

    /**
     * Get attack opportunity score
     */
    getAttackPotential(pos, pawn, gameState) {
        const enemies = this.getEnemyPawns(pawn.player, gameState);
        let attackScore = 0;

        enemies.forEach(enemy => {
            if (!enemy.position || !enemy.active) return;

            const distance = Math.abs(enemy.position.x - pos.x) + 
                           Math.abs(enemy.position.y - pos.y);

            if (distance === 1) {
                const damage = Math.min(pawn.attack || 1, enemy.hp);
                const killBonus = damage >= enemy.hp ? 0.5 : 0;
                attackScore += (damage / (enemy.maxHp || enemy.hp)) + killBonus;
            } else if (distance <= (pawn.stamina || 1)) {
                attackScore += 0.1;
            }
        });

        return Math.min(attackScore, 1);
    }

    /**
     * Get territory control score
     */
    getControlScore(pos, player, gameState) {
        const centerX = 5;
        const centerY = 5;
        
        const distanceFromCenter = Math.abs(pos.x - centerX) + Math.abs(pos.y - centerY);
        const centerControl = 1 - (distanceFromCenter / 10);

        const forwardProgress = player === 1 ? 
            (10 - pos.y) / 10 : 
            pos.y / 10;

        const allies = this.getAlliedPawns(player, gameState);
        let supportScore = 0;

        allies.forEach(ally => {
            if (!ally.position || !ally.active || ally.id === gameState.currentPawn?.id) return;

            const distance = Math.abs(ally.position.x - pos.x) + 
                           Math.abs(ally.position.y - pos.y);

            if (distance <= 2) {
                supportScore += (3 - distance) / 6;
            }
        });

        return (centerControl * 0.3) + (forwardProgress * 0.5) + (supportScore * 0.2);
    }

    /**
     * Get pawn safety score
     */
    getPawnSafetyScore(pos, pawn, gameState) {
        const boardEdgeDistance = Math.min(
            pos.x, 
            10 - pos.x,
            pos.y,
            10 - pos.y
        );

        const edgeSafety = boardEdgeDistance / 5;

        const allies = this.getAlliedPawns(pawn.player, gameState);
        let coverScore = 0;

        allies.forEach(ally => {
            if (!ally.position || !ally.active || ally.id === pawn.id) return;

            const distance = Math.abs(ally.position.x - pos.x) + 
                           Math.abs(ally.position.y - pos.y);

            if (distance === 1) {
                coverScore += 0.3;
            } else if (distance === 2) {
                coverScore += 0.1;
            }
        });

        const retreatOptions = this.countRetreatOptions(pos, pawn, gameState);
        const mobilityScore = Math.min(retreatOptions / 4, 1) * 0.3;

        return (edgeSafety * 0.3) + (coverScore * 0.4) + (mobilityScore * 0.3);
    }

    /**
     * Calculate counter damage potential
     */
    calculateCounterDamage(target, attacker) {
        if (!target.active || target.hp <= 0) return 0;
        
        const targetAttack = target.attack || 0;
        return Math.min(targetAttack, attacker.hp);
    }

    /**
     * Get value of a target pawn
     */
    getTargetValue(target, gameState) {
        const hpValue = target.hp / (target.maxHp || 3);
        const staminaValue = (target.stamina || 1) / 5;
        const attackValue = (target.attack || 1) / 5;
        
        const positionValue = this.getPositionValue(
            target.position, 
            target.player, 
            gameState
        );

        return (hpValue * 0.2) + 
               (staminaValue * 0.2) + 
               (attackValue * 0.3) + 
               (positionValue * 0.3);
    }

    /**
     * Get position value for a pawn
     */
    getPositionValue(pos, player, gameState) {
        if (!pos) return 0;

        const forwardProgress = player === 1 ? 
            (10 - pos.y) / 10 : 
            pos.y / 10;

        const havenDistance = this.getHavenProximityScore(pos, player, gameState);

        return (forwardProgress * 0.6) + (havenDistance * 0.4);
    }

    /**
     * Count retreat options from a position
     */
    countRetreatOptions(pos, pawn, gameState) {
        const directions = [
            { x: 0, y: 1 },
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: -1, y: 0 }
        ];

        let retreatCount = 0;

        directions.forEach(dir => {
            const newPos = {
                x: pos.x + dir.x,
                y: pos.y + dir.y
            };

            if (this.isValidPosition(newPos) && 
                !this.isOccupied(newPos, gameState)) {
                const threatAtNew = this.getThreatScore(newPos, pawn, gameState);
                const currentThreat = this.getThreatScore(pos, pawn, gameState);
                
                if (threatAtNew > currentThreat) {
                    retreatCount++;
                }
            }
        });

        return retreatCount;
    }

    /**
     * Get difficulty weights
     */
    getDifficultyWeights(difficulty) {
        return this.weights[difficulty] || this.weights.medium;
    }

    /**
     * Calculate weighted score
     */
    calculateWeightedScore(scores, weights) {
        let total = 0;
        let weightSum = 0;

        for (const [key, value] of Object.entries(scores)) {
            if (weights[key] !== undefined) {
                total += value * weights[key];
                weightSum += weights[key];
            }
        }

        return weightSum > 0 ? total / weightSum : 0;
    }

    /**
     * Classify move type based on scores
     */
    classifyMoveType(scores) {
        const maxScore = Math.max(...Object.values(scores));
        
        for (const [key, value] of Object.entries(scores)) {
            if (value === maxScore) {
                switch(key) {
                    case 'havenDistance': return 'advance';
                    case 'threatLevel': return 'retreat';
                    case 'attackOpportunity': return 'aggressive';
                    case 'territoryControl': return 'positional';
                    case 'pawnSafety': return 'defensive';
                    default: return 'mixed';
                }
            }
        }

        return 'mixed';
    }

    /**
     * Get enemy pawns
     */
    getEnemyPawns(player, gameState) {
        const enemyPlayer = player === 1 ? 2 : 1;
        return gameState.pawns?.filter(p => p.player === enemyPlayer) || [];
    }

    /**
     * Get allied pawns
     */
    getAlliedPawns(player, gameState) {
        return gameState.pawns?.filter(p => p.player === player) || [];
    }

    /**
     * Check if position is valid
     */
    isValidPosition(pos) {
        return pos.x >= 0 && pos.x <= 10 && pos.y >= 0 && pos.y <= 10;
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
     * Update weights based on performance
     */
    updateWeights(difficulty, performance) {
        const currentWeights = this.weights[difficulty];
        const learningRate = 0.1;

        if (performance.winRate < 0.3) {
            currentWeights.randomness = Math.min(
                currentWeights.randomness + learningRate, 
                0.3
            );
            currentWeights.attackOpportunity = Math.max(
                currentWeights.attackOpportunity - learningRate, 
                0.1
            );
        } else if (performance.winRate > 0.7) {
            currentWeights.randomness = Math.max(
                currentWeights.randomness - learningRate, 
                0
            );
            currentWeights.attackOpportunity = Math.min(
                currentWeights.attackOpportunity + learningRate, 
                0.4
            );
        }

        this.normalizeWeights(currentWeights);
    }

    /**
     * Normalize weights to sum to 1
     */
    normalizeWeights(weights) {
        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        
        if (sum > 0) {
            for (const key in weights) {
                weights[key] = weights[key] / sum;
            }
        }
    }
}