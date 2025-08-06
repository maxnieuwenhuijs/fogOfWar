// Physics Attack Synchronization for Multiplayer
class PhysicsAttackSync {
    constructor() {
        // Don't set up listeners immediately - wait for game to start
        this.listenersSetup = false;
    }
    
    setupSocketListeners() {
        // Try to set up listeners immediately and also when socket becomes available
        const trySetup = () => {
            if (typeof socket === 'undefined' || !socket) {
                // Don't retry in single player mode
                if (window.gameState?.singleplayerMode) {
                    console.log('Physics attack sync - single player mode, no socket needed');
                    return;
                }
                // Only log once every 5 retries to reduce spam
                if (!window._syncRetryCount) window._syncRetryCount = 0;
                if (window._syncRetryCount++ % 5 === 0) {
                    console.warn('Socket not available for physics attack sync, will retry...');
                }
                setTimeout(trySetup, 1000);
                return;
            }
            
            console.log('Setting up physics attack sync socket listeners');
            
            // Check if this is a mock socket (single player)
            if (socket.emit && !socket._originalEmit && window.gameState?.singleplayerMode) {
                console.log('Mock socket detected for single player - skipping physics sync setup');
                return;
            }
            
            // Remove any existing listeners first
            if (socket.off) {
                socket.off('physicsAttackAnimation');
            }
            
            // Listen for physics attack animations from other players
            if (socket.on) {
                socket.on('physicsAttackAnimation', (data) => {
                console.log('🎯 Received physics attack animation:', data);
                
                // Don't play our own animations again
                if (data.playerId === gameState.playerNumber) {
                    console.log('Ignoring own physics attack animation');
                    return;
                }
                
                // Find the pawns
                const attackingPawn = this.findPawnById(data.attackerId);
                const targetPawn = this.findPawnById(data.targetId);
                
                if (!attackingPawn || !targetPawn) {
                    console.error('Could not find pawns for physics attack animation');
                    console.error('  Attacker ID:', data.attackerId, 'Found:', !!attackingPawn);
                    console.error('  Target ID:', data.targetId, 'Found:', !!targetPawn);
                    return;
                }
                
                // Play the animation
                this.playRemotePhysicsAttack(attackingPawn, targetPawn, data);
                });
            }
        };
        
        trySetup();
    }
    
    findPawnById(pawnId) {
        if (!gameState || !gameState.players) return null;
        
        for (const player of Object.values(gameState.players)) {
            if (player.pawns) {
                const pawn = player.pawns.find(p => p.id === pawnId);
                if (pawn) return pawn;
            }
        }
        return null;
    }
    
    // Send attack data to other players
    sendPhysicsAttack(attackingPawn, targetPawn, attackPower, dragDirection) {
        if (window.gameState?.singleplayerMode) {
            console.log('Single player mode - not sending physics attack');
            return;
        }
        
        if (typeof socket === 'undefined' || !socket) {
            console.error('Cannot send physics attack - socket not available');
            return;
        }
        
        const data = {
            playerId: gameState.playerNumber,
            attackerId: attackingPawn.id,
            targetId: targetPawn.id,
            attackPower: attackPower,
            dragDirection: {
                x: dragDirection.x,
                y: dragDirection.y,
                startPoint: dragDirection.startPoint,
                endPoint: dragDirection.endPoint
            },
            timestamp: Date.now()
        };
        
        console.log('📤 Sending physics attack animation:', data);
        socket.emit('physicsAttackAnimation', data);
    }
    
    // Play the physics attack animation for remote players
    playRemotePhysicsAttack(attackingPawn, targetPawn, data) {
        console.log('🎬 Playing remote physics attack animation');
        console.log('  Attacker:', attackingPawn.id, 'at', attackingPawn.gridX, attackingPawn.gridY);
        console.log('  Target:', targetPawn.id, 'at', targetPawn.gridX, targetPawn.gridY);
        console.log('  Power:', data.attackPower);
        console.log('  Direction:', data.dragDirection);
        
        // Create a temporary physics attack instance
        const tempAttack = new PhysicsAttackAnimationPlayer();
        tempAttack.playAttack(attackingPawn, targetPawn, data.attackPower, data.dragDirection);
    }
}

// Simplified animation player for remote attacks
class PhysicsAttackAnimationPlayer {
    playAttack(attacker, target, attackPower, dragDirection) {
        if (!attacker || !target) return;
        
        console.log('🎮 Starting remote attack animation');
        console.log('  Original drag direction:', dragDirection);
        
        // Get positions
        const attackerPos = gridToPixel(attacker.gridX, attacker.gridY);
        const targetPos = gridToPixel(target.gridX, target.gridY);
        
        // ALWAYS calculate direction from attacker to target for consistent animation
        // This fixes the issue where player 2 animations go the wrong way
        const dx = (targetPos.x + CELL_SIZE/2) - (attackerPos.x + CELL_SIZE/2);
        const dy = (targetPos.y + CELL_SIZE/2) - (attackerPos.y + CELL_SIZE/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        console.log('  Using attacker->target direction (fixes player 2 issue)');
        console.log('  Drag direction was:', dragDirection);
        console.log('  Calculated direction:', {dirX, dirY});
        
        // Get physics settings
        const settings = window.physicsTestPanel?.settings || {
            attackerSpeed: 8,
            baseForce: 3,
            forceMultiplier: 2,
            maxFrames: 120
        };
        
        // Simple animation without Matter.js for display only
        gameState.isAnimating = true;
        const originalTargetPos = {x: target.gridX, y: target.gridY};
        
        // Wind-up phase
        const windupFrames = 15;
        const windupDistance = 20 + attackPower * 5;
        
        // Calculate the actual direction from attacker to target
        const attackDirX = (targetPos.x - attackerPos.x) / Math.sqrt(Math.pow(targetPos.x - attackerPos.x, 2) + Math.pow(targetPos.y - attackerPos.y, 2));
        const attackDirY = (targetPos.y - attackerPos.y) / Math.sqrt(Math.pow(targetPos.x - attackerPos.x, 2) + Math.pow(targetPos.y - attackerPos.y, 2));
        
        let frame = 0;
        let attackerMoving = true;
        let targetVelocity = {x: 0, y: 0};
        let targetPosition = {x: targetPos.x + CELL_SIZE/2, y: targetPos.y + CELL_SIZE/2};
        
        const animate = () => {
            frame++;
            
            if (frame > settings.maxFrames) {
                // Cleanup
                this.finishAnimation(attacker, target, originalTargetPos);
                return;
            }
            
            // Wind-up phase - pull back opposite to attack direction
            if (frame <= windupFrames && attacker.pixiObject && !attacker.pixiObject.destroyed) {
                const progress = frame / windupFrames;
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                // Pull back in opposite direction of attack
                attacker.pixiObject.x = attackerPos.x + CELL_SIZE/2 - attackDirX * windupDistance * easedProgress;
                attacker.pixiObject.y = attackerPos.y + CELL_SIZE/2 - attackDirY * windupDistance * easedProgress;
            }
            
            // Attack phase
            else if (frame > windupFrames && frame <= windupFrames + 20 && attacker.pixiObject && !attacker.pixiObject.destroyed) {
                const attackProgress = (frame - windupFrames) / 20;
                const startX = attackerPos.x + CELL_SIZE/2 - attackDirX * windupDistance;
                const startY = attackerPos.y + CELL_SIZE/2 - attackDirY * windupDistance;
                
                attacker.pixiObject.x = startX + (targetPos.x + CELL_SIZE/2 - startX) * attackProgress;
                attacker.pixiObject.y = startY + (targetPos.y + CELL_SIZE/2 - startY) * attackProgress;
                
                // Check for collision
                const dist = Math.sqrt(
                    Math.pow(attacker.pixiObject.x - targetPosition.x, 2) +
                    Math.pow(attacker.pixiObject.y - targetPosition.y, 2)
                );
                
                if (dist < CELL_SIZE && attackerMoving) {
                    attackerMoving = false;
                    
                    // Launch target
                    const impulsePower = settings.baseForce + attackPower * settings.forceMultiplier;
                    targetVelocity = {
                        x: dirX * impulsePower,
                        y: dirY * impulsePower
                    };
                    
                    // Effects
                    this.createImpactEffect(targetPosition.x, targetPosition.y);
                    if (typeof triggerCameraShake === 'function') {
                        triggerCameraShake(10 + attackPower * 3, 300);
                    }
                    // Sound is handled by game-logic.js to avoid duplication
                }
            }
            
            // Move attacker to target position after hit
            else if (!attackerMoving && attacker.pixiObject && !attacker.pixiObject.destroyed) {
                const pos = gridToPixel(originalTargetPos.x, originalTargetPos.y);
                attacker.pixiObject.x = pos.x + CELL_SIZE/2;
                attacker.pixiObject.y = pos.y + CELL_SIZE/2;
            }
            
            // Update target position with physics
            if (!attackerMoving && target.pixiObject && !target.pixiObject.destroyed) {
                // Apply velocity
                targetPosition.x += targetVelocity.x;
                targetPosition.y += targetVelocity.y;
                
                // Apply friction
                targetVelocity.x *= 0.98;
                targetVelocity.y *= 0.98;
                
                // Simple wall bouncing
                if (targetPosition.x < CELL_SIZE/2 || targetPosition.x > BOARD_WIDTH - CELL_SIZE/2) {
                    targetVelocity.x *= -0.7;
                    targetPosition.x = Math.max(CELL_SIZE/2, Math.min(BOARD_WIDTH - CELL_SIZE/2, targetPosition.x));
                }
                if (targetPosition.y < CELL_SIZE/2 || targetPosition.y > BOARD_HEIGHT - CELL_SIZE/2) {
                    targetVelocity.y *= -0.7;
                    targetPosition.y = Math.max(CELL_SIZE/2, Math.min(BOARD_HEIGHT - CELL_SIZE/2, targetPosition.y));
                }
                
                // Update visual
                target.pixiObject.x = targetPosition.x;
                target.pixiObject.y = targetPosition.y;
                target.pixiObject.rotation = frame * 0.15;
                
                // Fade when slow
                const speed = Math.sqrt(targetVelocity.x * targetVelocity.x + targetVelocity.y * targetVelocity.y);
                if (speed < 2) {
                    target.pixiObject.alpha = Math.max(0, target.pixiObject.alpha - 0.03);
                }
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }
    
    createImpactEffect(x, y) {
        if (!app || !app.stage) return;
        
        const impactContainer = new PIXI.Container();
        
        for (let i = 0; i < 3; i++) {
            const circle = new PIXI.Graphics();
            circle.lineStyle(3 - i, 0xFFFF00, 1);
            circle.drawCircle(0, 0, 10);
            impactContainer.addChild(circle);
            
            const startRadius = 10 + i * 5;
            const endRadius = 30 + i * 10;
            let progress = 0;
            
            const animateCircle = () => {
                progress += 0.05;
                if (progress >= 1) {
                    impactContainer.removeChild(circle);
                    if (impactContainer.children.length === 0) {
                        app.stage.removeChild(impactContainer);
                    }
                    return;
                }
                
                const currentRadius = startRadius + (endRadius - startRadius) * progress;
                circle.clear();
                circle.lineStyle(3 - i, 0xFFFF00, 1 - progress);
                circle.drawCircle(0, 0, currentRadius);
                
                requestAnimationFrame(animateCircle);
            };
            
            setTimeout(() => animateCircle(), i * 50);
        }
        
        impactContainer.x = x;
        impactContainer.y = y;
        app.stage.addChild(impactContainer);
    }
    
    finishAnimation(attacker, target, originalTargetPos) {
        gameState.isAnimating = false;
        
        // Reset positions
        if (attacker.pixiObject && !attacker.pixiObject.destroyed) {
            const pos = gridToPixel(originalTargetPos.x, originalTargetPos.y);
            attacker.pixiObject.x = pos.x + CELL_SIZE/2;
            attacker.pixiObject.y = pos.y + CELL_SIZE/2;
        }
        
        if (target.pixiObject && !target.pixiObject.destroyed) {
            target.pixiObject.alpha = 1;
            target.pixiObject.rotation = 0;
        }
    }
}

// Create global instance but don't start it yet
window.physicsAttackSync = new PhysicsAttackSync();

// Function to start physics attack sync when game starts
window.startPhysicsAttackSync = function() {
    if (window.physicsAttackSync && !window.physicsAttackSync.listenersSetup) {
        window.physicsAttackSync.setupSocketListeners();
        window.physicsAttackSync.listenersSetup = true;
        console.log('Physics Attack Sync started');
    }
};