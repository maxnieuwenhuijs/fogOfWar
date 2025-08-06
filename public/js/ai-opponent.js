// AI Opponent for Fog of War Single Player
class AIOpponent {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.playerNumber = 2; // AI is always player 2
        this.thinkingDelay = this.getThinkingDelay();
        this.aggressiveness = this.getAggressiveness();
        this.defensiveness = this.getDefensiveness();
    }

    getThinkingDelay() {
        switch (this.difficulty) {
            case 'easy': return { min: 1500, max: 3000 };
            case 'medium': return { min: 1000, max: 2000 };
            case 'hard': return { min: 500, max: 1000 };
            default: return { min: 1000, max: 2000 };
        }
    }

    getAggressiveness() {
        switch (this.difficulty) {
            case 'easy': return 0.3;
            case 'medium': return 0.6;
            case 'hard': return 0.8;
            default: return 0.6;
        }
    }

    getDefensiveness() {
        switch (this.difficulty) {
            case 'easy': return 0.7;
            case 'medium': return 0.5;
            case 'hard': return 0.3;
            default: return 0.5;
        }
    }

    // Generate card definitions for setup phase
    generateCardDefinition(roundNumber) {
        const delay = Math.random() * (this.thinkingDelay.max - this.thinkingDelay.min) + this.thinkingDelay.min;
        
        setTimeout(() => {
            let cards = [];
            
            switch (this.difficulty) {
                case 'easy':
                    // Easy AI uses simple balanced builds
                    cards = [
                        { hp: 3, stamina: 2, attack: 2 },
                        { hp: 2, stamina: 3, attack: 2 },
                        { hp: 2, stamina: 2, attack: 3 }
                    ];
                    break;
                    
                case 'medium':
                    // Medium AI uses some specialization
                    if (roundNumber === 1) {
                        cards = [
                            { hp: 4, stamina: 1, attack: 2 }, // Tank
                            { hp: 2, stamina: 3, attack: 2 }, // Balanced
                            { hp: 1, stamina: 3, attack: 3 }  // Glass cannon
                        ];
                    } else if (roundNumber === 2) {
                        cards = [
                            { hp: 3, stamina: 2, attack: 2 }, // Balanced
                            { hp: 1, stamina: 5, attack: 1 }, // Speed demon
                            { hp: 2, stamina: 2, attack: 3 }  // Attacker
                        ];
                    } else {
                        cards = [
                            { hp: 3, stamina: 3, attack: 1 }, // Mobile tank
                            { hp: 2, stamina: 2, attack: 3 }, // Attacker
                            { hp: 1, stamina: 1, attack: 5 }  // Pure damage
                        ];
                    }
                    break;
                    
                case 'hard':
                    // Hard AI uses optimized builds
                    if (roundNumber === 1) {
                        cards = [
                            { hp: 4, stamina: 2, attack: 1 }, // Early tank
                            { hp: 1, stamina: 5, attack: 1 }, // Rush unit
                            { hp: 2, stamina: 1, attack: 4 }  // Defender
                        ];
                    } else if (roundNumber === 2) {
                        cards = [
                            { hp: 3, stamina: 1, attack: 3 }, // Heavy hitter
                            { hp: 1, stamina: 4, attack: 2 }, // Fast striker
                            { hp: 2, stamina: 3, attack: 2 }  // Balanced
                        ];
                    } else {
                        cards = [
                            { hp: 1, stamina: 1, attack: 5 }, // Assassin
                            { hp: 3, stamina: 3, attack: 1 }, // Mobile defender
                            { hp: 2, stamina: 2, attack: 3 }  // All-rounder
                        ];
                    }
                    break;
            }
            
            // Emit the card definition
            this.emitCardDefinition(cards);
        }, delay);
    }

    emitCardDefinition(cards) {
        console.log('🤖 AI emitting card definition:', cards);
        // Simulate socket event for single player
        if (typeof handleOpponentCardDefinition === 'function') {
            handleOpponentCardDefinition({
                player: this.playerNumber,
                cards: cards
            });
        } else {
            console.error('🤖 handleOpponentCardDefinition function not found!');
        }
    }

    // Handle pawn linking phase
    performPawnLinking() {
        const delay = Math.random() * (this.thinkingDelay.max - this.thinkingDelay.min) + this.thinkingDelay.min;
        
        setTimeout(() => {
            const aiPawns = gameState.players[this.playerNumber].pawns.filter(p => p.isActive && !p.card);
            const availableCards = gameState.players[this.playerNumber].availableCards.filter(c => !c.linkedPawn);
            
            console.log('🤖 AI linking check:', {
                aiPawns: aiPawns.length,
                availableCards: availableCards.length,
                aiPawnIds: aiPawns.map(p => p.id),
                cardIds: availableCards.map(c => c.id)
            });
            
            if (aiPawns.length === 0 || availableCards.length === 0) {
                console.log('🤖 AI has no pawns or cards to link');
                return;
            }
            
            // AI linking strategy based on difficulty
            let linkings = [];
            
            if (this.difficulty === 'easy') {
                // Random linking
                linkings = this.randomLinking(aiPawns, availableCards);
            } else if (this.difficulty === 'medium') {
                // Some strategy - high stamina units to front, tanks to defend
                linkings = this.strategicLinking(aiPawns, availableCards, 0.5);
            } else {
                // Optimal linking
                linkings = this.strategicLinking(aiPawns, availableCards, 0.8);
            }
            
            console.log('🤖 AI selected linking:', linkings[0]);
            
            // Emit the linking
            this.emitPawnLinking(linkings[0]);
        }, delay);
    }

    randomLinking(pawns, cards) {
        const randomPawn = pawns[Math.floor(Math.random() * pawns.length)];
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        return [{ pawnId: randomPawn.id, cardId: randomCard.id }];
    }

    strategicLinking(pawns, cards, strategyLevel) {
        // Sort cards by their properties
        const fastCards = [...cards].sort((a, b) => b.stamina - a.stamina);
        const tankCards = [...cards].sort((a, b) => b.hp - a.hp);
        const attackCards = [...cards].sort((a, b) => b.attack - a.attack);
        
        // Find pawns by position
        const frontPawns = pawns.filter(p => p.gridY >= 7);
        const backPawns = pawns.filter(p => p.gridY <= 3);
        const middlePawns = pawns.filter(p => p.gridY > 3 && p.gridY < 7);
        
        // Choose based on strategy level
        if (Math.random() < strategyLevel) {
            // Put high stamina units in front for rushing
            if (frontPawns.length > 0 && fastCards.length > 0) {
                return [{ pawnId: frontPawns[0].id, cardId: fastCards[0].id }];
            }
            // Put tanks in defensive positions
            if (backPawns.length > 0 && tankCards.length > 0) {
                return [{ pawnId: backPawns[0].id, cardId: tankCards[0].id }];
            }
        }
        
        // Fallback to random
        return this.randomLinking(pawns, cards);
    }

    emitPawnLinking(linking) {
        console.log('🤖 AI emitting pawn linking:', linking);
        // Simulate socket event for single player
        if (typeof handleOpponentPawnLinking === 'function') {
            handleOpponentPawnLinking({
                player: this.playerNumber,
                pawnId: linking.pawnId,
                cardId: linking.cardId
            });
        } else {
            console.error('🤖 handleOpponentPawnLinking function not found!');
        }
    }

    // Handle action phase - movement and attacks
    performAction() {
        const delay = Math.random() * (this.thinkingDelay.max - this.thinkingDelay.min) + this.thinkingDelay.min;
        
        setTimeout(() => {
            const aiPawns = gameState.players[this.playerNumber].pawns.filter(p => p.isActive && !p.hasActed);
            if (aiPawns.length === 0) {
                this.endTurn();
                return;
            }
            
            // Evaluate all possible actions
            const actions = this.evaluateActions(aiPawns);
            
            // Choose best action based on difficulty
            let chosenAction;
            if (this.difficulty === 'easy') {
                // Random action with some preference for attacks
                chosenAction = this.chooseRandomAction(actions);
            } else if (this.difficulty === 'medium') {
                // Choose good actions most of the time
                chosenAction = Math.random() < 0.7 ? this.chooseBestAction(actions) : this.chooseRandomAction(actions);
            } else {
                // Always choose best action
                chosenAction = this.chooseBestAction(actions);
            }
            
            // Execute the chosen action
            if (chosenAction) {
                this.executeAction(chosenAction);
            } else {
                this.endTurn();
            }
        }, delay);
    }

    evaluateActions(pawns) {
        const actions = [];
        const enemyPawns = gameState.players[1].pawns.filter(p => p.isActive);
        const enemyHavens = ALL_TARGET_HAVENS_P1; // AI targets player 1 havens
        
        for (const pawn of pawns) {
            // Evaluate attacks
            for (const enemy of enemyPawns) {
                const distance = Math.abs(pawn.gridX - enemy.gridX) + Math.abs(pawn.gridY - enemy.gridY);
                if (distance === 1) {
                    // Adjacent enemy - can attack
                    const score = this.evaluateAttack(pawn, enemy);
                    actions.push({
                        type: 'attack',
                        pawn: pawn,
                        target: enemy,
                        score: score
                    });
                }
            }
            
            // Evaluate moves
            const possibleMoves = this.getPossibleMoves(pawn);
            for (const move of possibleMoves) {
                const score = this.evaluateMove(pawn, move, enemyPawns, enemyHavens);
                actions.push({
                    type: 'move',
                    pawn: pawn,
                    target: move,
                    score: score
                });
            }
        }
        
        return actions;
    }

    evaluateAttack(attacker, target) {
        let score = 50; // Base score for attacks
        
        // Bonus for killing blow
        if (target.card.hp <= attacker.card.attack) {
            score += 100;
        }
        
        // Bonus for attacking high value targets
        score += target.card.attack * 10;
        score += target.card.stamina * 5;
        
        // Penalty if we might die in counter attack
        if (attacker.card.hp <= target.card.attack) {
            score -= 50;
        }
        
        return score * this.aggressiveness;
    }

    evaluateMove(pawn, targetPos, enemyPawns, enemyHavens) {
        let score = 10; // Base score for moves
        
        // Check if move reaches enemy haven
        const isHavenMove = enemyHavens.some(h => h.x === targetPos.x && h.y === targetPos.y);
        if (isHavenMove) {
            score += 1000; // Extremely high priority
        }
        
        // Evaluate distance to nearest enemy haven
        const nearestHavenDist = Math.min(...enemyHavens.map(h => 
            Math.abs(targetPos.x - h.x) + Math.abs(targetPos.y - h.y)
        ));
        score += (10 - nearestHavenDist) * 5;
        
        // Evaluate threats and opportunities
        for (const enemy of enemyPawns) {
            const distance = Math.abs(targetPos.x - enemy.gridX) + Math.abs(targetPos.y - enemy.gridY);
            
            if (distance === 1) {
                // Would be adjacent to enemy
                if (pawn.card.attack >= enemy.card.hp) {
                    score += 30; // Can kill next turn
                } else if (enemy.card.attack >= pawn.card.hp) {
                    score -= 40 * this.defensiveness; // Might die
                }
            }
        }
        
        return score;
    }

    getPossibleMoves(pawn) {
        const moves = [];
        const stamina = pawn.card.stamina;
        
        // Simple movement - check all cells within stamina range
        for (let dx = -stamina; dx <= stamina; dx++) {
            for (let dy = -stamina; dy <= stamina; dy++) {
                if (Math.abs(dx) + Math.abs(dy) > stamina) continue;
                
                const newX = pawn.gridX + dx;
                const newY = pawn.gridY + dy;
                
                if (newX >= 0 && newX < BOARD_SIZE && newY >= 0 && newY < BOARD_SIZE) {
                    // Check if cell is empty
                    const occupied = [...gameState.players[1].pawns, ...gameState.players[2].pawns]
                        .some(p => p.isActive && p.gridX === newX && p.gridY === newY);
                    
                    if (!occupied) {
                        moves.push({ x: newX, y: newY });
                    }
                }
            }
        }
        
        return moves;
    }

    chooseRandomAction(actions) {
        if (actions.length === 0) return null;
        return actions[Math.floor(Math.random() * actions.length)];
    }

    chooseBestAction(actions) {
        if (actions.length === 0) return null;
        return actions.reduce((best, current) => 
            current.score > best.score ? current : best
        );
    }

    executeAction(action) {
        if (action.type === 'attack') {
            // Use physics attack for visual appeal
            const startX = action.pawn.pixiObject.x;
            const startY = action.pawn.pixiObject.y;
            const endX = action.target.pixiObject.x;
            const endY = action.target.pixiObject.y;
            
            // Calculate drag direction
            const dx = endX - startX;
            const dy = endY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const power = Math.min(distance / 100, 10); // Reasonable power
            
            // Simulate physics attack
            if (window.physicsAttackSystem) {
                window.physicsAttackSystem.attackingPawn = action.pawn;
                window.physicsAttackSystem.targetPawn = action.target;
                window.physicsAttackSystem.attackPower = power;
                window.physicsAttackSystem.startPoint = {x: startX, y: startY};
                window.physicsAttackSystem.endPoint = {x: endX, y: endY};
                window.physicsAttackSystem.executeAttack();
            } else {
                // Fallback to normal attack
                this.emitAction({
                    type: 'attack',
                    pawnId: action.pawn.id,
                    targetId: action.target.id
                });
            }
        } else if (action.type === 'move') {
            this.emitAction({
                type: 'move',
                pawnId: action.pawn.id,
                targetX: action.target.x,
                targetY: action.target.y
            });
        }
    }

    emitAction(actionData) {
        // Simulate socket event for single player
        if (gameState.currentPhase === 'ACTION') {
            if (actionData.type === 'move' && typeof handleOpponentMove === 'function') {
                handleOpponentMove({
                    pawnId: actionData.pawnId,
                    targetX: actionData.targetX,
                    targetY: actionData.targetY
                });
            } else if (actionData.type === 'attack' && typeof handleOpponentAttack === 'function') {
                handleOpponentAttack({
                    attackerId: actionData.pawnId,
                    targetId: actionData.targetId
                });
            }
        }
    }

    endTurn() {
        // End AI turn
        if (typeof endTurn === 'function') {
            endTurn();
        }
    }

    // Handle RPS tiebreaker
    performRPSTiebreaker() {
        const delay = Math.random() * (this.thinkingDelay.max - this.thinkingDelay.min) + this.thinkingDelay.min;
        
        setTimeout(() => {
            const choices = ['rock', 'paper', 'scissors'];
            let choice;
            
            if (this.difficulty === 'easy') {
                // Random choice
                choice = choices[Math.floor(Math.random() * 3)];
            } else if (this.difficulty === 'medium') {
                // Slightly weighted choices
                const weights = [0.35, 0.35, 0.3]; // Slight preference for rock/paper
                choice = this.weightedChoice(choices, weights);
            } else {
                // Try to predict player patterns (simplified)
                // In a real implementation, this would track player history
                choice = choices[Math.floor(Math.random() * 3)];
            }
            
            this.emitRPSChoice(choice);
        }, delay);
    }

    weightedChoice(choices, weights) {
        const random = Math.random();
        let sum = 0;
        for (let i = 0; i < choices.length; i++) {
            sum += weights[i];
            if (random < sum) return choices[i];
        }
        return choices[choices.length - 1];
    }

    emitRPSChoice(choice) {
        if (typeof handleOpponentRPSChoice === 'function') {
            handleOpponentRPSChoice({ choice: choice });
        }
    }
}

// Create global AI instance when needed
window.createAIOpponent = function(difficulty) {
    window.aiOpponent = new AIOpponent(difficulty);
    console.log(`AI Opponent created with ${difficulty} difficulty`);
    return window.aiOpponent;
};