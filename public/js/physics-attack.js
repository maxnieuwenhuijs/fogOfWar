// Physics-based attack system using Matter.js
// 
// How to use:
// 1. Select your pawn by clicking on it
// 2. Hold down left mouse button on your selected pawn
// 3. Drag to create an attack line pointing towards an enemy pawn
// 4. Release mouse button to launch your pawn at the enemy
// 5. Your pawn will swoop in and bump the enemy with physics
// 6. After collision, your pawn takes the enemy's position
// 7. The enemy pawn is removed from the board
//
// Attack power is determined by drag distance (longer = more powerful)
class PhysicsAttackSystem {
    constructor() {
        this.engine = null;
        this.world = null;
        this.render = null;
        this.runner = null;
        this.attackLine = null;
        this.isDrawingAttack = false;
        this.startPoint = null;
        this.endPoint = null;
        this.attackingPawn = null;
        this.targetPawn = null;
        this.physicsBodies = new Map(); // Map pawn ID to physics body
        this.attackLineGraphics = null;
        this.attackPower = 0;
        this.angleToEnemy = 0;
        this.isDragging = false;
        this.initialize();
    }

    initialize() {
        // Create Matter.js engine
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        
        // Reduce gravity for more floaty physics
        this.engine.world.gravity.y = 0.5;
        
        // Create runner for physics updates
        this.runner = Matter.Runner.create();
        
        // Initialize attack line graphics (will be added when needed)
        this.attackLineGraphics = null;
        
        // Create debug element
        this.createDebugElement();
        
        console.log("Physics attack system initialized");
    }
    
    createPawnBodies(tempEngine, excludePawns = []) {
        // Create physics bodies for all pawns except the ones involved in the attack
        const pawnBodies = [];
        
        if (typeof gameState !== 'undefined' && gameState.players) {
            for (const player of Object.values(gameState.players)) {
                if (player.pawns) {
                    for (const pawn of player.pawns) {
                        // Skip pawns that are excluded (attacker and target)
                        if (excludePawns.some(ep => ep.id === pawn.id)) continue;
                        if (!pawn.isActive || !pawn.pixiObject) continue;
                        
                        const pos = gridToPixel(pawn.gridX, pawn.gridY);
                        const pawnBody = Matter.Bodies.circle(
                            pos.x + CELL_SIZE / 2,
                            pos.y + CELL_SIZE / 2,
                            CELL_SIZE * 0.35,
                            {
                                isStatic: true,
                                restitution: 0.5
                            }
                        );
                        pawnBodies.push(pawnBody);
                    }
                }
            }
        }
        
        if (pawnBodies.length > 0) {
            Matter.World.add(tempEngine.world, pawnBodies);
        }
        
        return pawnBodies;
    }

    startAttackDrag(startX, startY, pawn, targetPawn) {
        if (!pawn || !pawn.isActive || !targetPawn) {
            console.error("startAttackDrag failed - invalid parameters", {pawn, targetPawn});
            return;
        }
        
        console.log("🎯 Starting physics attack drag");
        console.log("  - App exists:", typeof app !== 'undefined');
        console.log("  - App stage exists:", typeof app !== 'undefined' && app && app.stage);
        console.log("  - Current graphics:", this.attackLineGraphics);
        
        // Ensure attack line graphics exist and are on top
        if (!this.attackLineGraphics) {
            if (typeof app !== 'undefined' && app && app.stage) {
                this.attackLineGraphics = new PIXI.Graphics();
                app.stage.addChild(this.attackLineGraphics);
                console.log("✅ Created new attack line graphics");
            } else {
                console.error("❌ Cannot create graphics - app/stage not available");
                return;
            }
        }
        
        // Move graphics to top
        if (this.attackLineGraphics && app && app.stage) {
            app.stage.setChildIndex(this.attackLineGraphics, app.stage.children.length - 1);
            console.log("✅ Moved graphics to top layer");
        }
        
        this.isDrawingAttack = true;
        this.isDragging = true;
        this.startPoint = { x: startX, y: startY };
        this.endPoint = { x: startX, y: startY };
        this.attackingPawn = pawn;
        this.targetPawn = targetPawn;
        
        // Calculate angle from enemy to attacker (since we're dragging FROM enemy)
        const attackerPos = gridToPixel(pawn.gridX, pawn.gridY);
        this.angleToEnemy = Math.atan2(
            attackerPos.y + CELL_SIZE/2 - startY,
            attackerPos.x + CELL_SIZE/2 - startX
        );
        
        console.log("✅ Attack drag initialized:");
        console.log("  - Attacker:", pawn.id, "at", {x: pawn.gridX, y: pawn.gridY});
        console.log("  - Target:", targetPawn.id, "at", {x: targetPawn.gridX, y: targetPawn.gridY});
        console.log("  - Start point:", this.startPoint);
        console.log("  - Angle to enemy:", this.angleToEnemy * 180 / Math.PI, "degrees");
        console.log("  - isDragging:", this.isDragging);
        console.log("  - isDrawingAttack:", this.isDrawingAttack);
        
        // Update debug display
        this.updateDebug();
    }

    updateAttackDrag(currentX, currentY) {
        if (!this.isDrawingAttack) {
            console.log("updateAttackDrag called but not drawing (isDrawingAttack = false)");
            return;
        }
        
        console.log("🖱️ Updating attack drag to:", {x: currentX, y: currentY});
        
        // Update debug display
        this.updateDebug();
        
        // Calculate angle of drag
        let dragAngle = Math.atan2(
            currentY - this.startPoint.y,
            currentX - this.startPoint.x
        );
        
        // Calculate angle difference from enemy direction
        let angleDiff = dragAngle - this.angleToEnemy;
        
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Limit to 180-degree arc AWAY from the attacker (since we're dragging from enemy)
        // The valid arc is opposite to the attacker's direction
        if (Math.abs(angleDiff) > Math.PI / 2) {
            // Clamp to the nearest edge of the allowed arc (opposite side)
            if (angleDiff > 0) {
                dragAngle = this.angleToEnemy - Math.PI / 2;
            } else {
                dragAngle = this.angleToEnemy + Math.PI / 2;
            }
            
            // Recalculate end point based on clamped angle
            const distance = Math.sqrt(
                Math.pow(currentX - this.startPoint.x, 2) + 
                Math.pow(currentY - this.startPoint.y, 2)
            );
            this.endPoint = {
                x: this.startPoint.x + Math.cos(dragAngle) * distance,
                y: this.startPoint.y + Math.sin(dragAngle) * distance
            };
        } else {
            this.endPoint = { x: currentX, y: currentY };
        }
        
        // Calculate attack power based on drag distance
        const distance = Math.sqrt(
            Math.pow(this.endPoint.x - this.startPoint.x, 2) + 
            Math.pow(this.endPoint.y - this.startPoint.y, 2)
        );
        this.attackPower = Math.min(distance / 50, 5); // Max power of 5
        
        // Draw attack line
        if (this.attackLineGraphics) {
            this.attackLineGraphics.clear();
            
            console.log("🎨 Drawing attack line:");
            console.log("  - From:", this.startPoint);
            console.log("  - To:", this.endPoint);
            console.log("  - Power:", this.attackPower);
            console.log("  - Graphics visible:", this.attackLineGraphics.visible);
            console.log("  - Graphics alpha:", this.attackLineGraphics.alpha);
            console.log("  - Parent:", this.attackLineGraphics.parent ? "has parent" : "no parent");
            
            // Draw main line with thicker width for visibility
            const lineWidth = 5 + this.attackPower * 2; // Thicker line
            this.attackLineGraphics.lineStyle(lineWidth, 0xFF0000, 1); // Full opacity
            this.attackLineGraphics.moveTo(this.startPoint.x, this.startPoint.y);
            this.attackLineGraphics.lineTo(this.endPoint.x, this.endPoint.y);
            
            // Draw arrow head
            const angle = Math.atan2(
                this.endPoint.y - this.startPoint.y,
                this.endPoint.x - this.startPoint.x
            );
            const arrowLength = 20 + this.attackPower * 3; // Bigger arrow
            const arrowAngle = 0.5;
            
            this.attackLineGraphics.lineStyle(4 + this.attackPower, 0xFF0000, 1); // Thicker, full opacity
            this.attackLineGraphics.moveTo(this.endPoint.x, this.endPoint.y);
            this.attackLineGraphics.lineTo(
                this.endPoint.x - arrowLength * Math.cos(angle - arrowAngle),
                this.endPoint.y - arrowLength * Math.sin(angle - arrowAngle)
            );
            this.attackLineGraphics.moveTo(this.endPoint.x, this.endPoint.y);
            this.attackLineGraphics.lineTo(
                this.endPoint.x - arrowLength * Math.cos(angle + arrowAngle),
                this.endPoint.y - arrowLength * Math.sin(angle + arrowAngle)
            );
            
            // Draw power indicator
            const midX = (this.startPoint.x + this.endPoint.x) / 2;
            const midY = (this.startPoint.y + this.endPoint.y) / 2;
            this.attackLineGraphics.beginFill(0xFFFF00, 1); // Yellow, full opacity
            this.attackLineGraphics.drawCircle(midX, midY, 8 + this.attackPower * 3); // Bigger circle
            this.attackLineGraphics.endFill();
            
            console.log("✅ Attack line drawn successfully");
        } else {
            console.error("❌ No attack line graphics available!");
        }
    }

    endAttackDrag() {
        console.log("🏁 Ending attack drag");
        console.log("  - isDrawingAttack:", this.isDrawingAttack);
        console.log("  - attackingPawn:", this.attackingPawn ? this.attackingPawn.id : "null");
        console.log("  - targetPawn:", this.targetPawn ? this.targetPawn.id : "null");
        console.log("  - attackPower:", this.attackPower);
        
        if (!this.isDrawingAttack || !this.attackingPawn || !this.targetPawn) {
            console.log("❌ Attack drag cancelled - missing required data");
            this.clearAttackLine();
            return;
        }
        
        // Clear the attack line
        if (this.attackLineGraphics) {
            this.attackLineGraphics.clear();
        }
        
        // Execute the attack if we have enough power
        if (this.attackPower > 0.5) {
            this.executePhysicsAttack();
        } else {
            console.log("Attack too weak, cancelling");
            this.clearAttackLine();
        }
        
        this.isDrawingAttack = false;
    }

    executePhysicsAttack() {
        if (!this.attackingPawn || !this.targetPawn) return;
        
        // Calculate launch direction (from attacker TO the drag direction)
        const direction = {
            x: this.endPoint.x - this.startPoint.x,
            y: this.endPoint.y - this.startPoint.y
        };
        const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        const normalizedDir = {
            x: direction.x / magnitude,
            y: direction.y / magnitude
        };
        
        // Create physics engine with no gravity initially
        const tempEngine = Matter.Engine.create();
        tempEngine.world.gravity.y = 0; // No gravity for horizontal movement
        
        // Create walls around the board
        const wallThickness = 50;
        const walls = [
            // Top wall
            Matter.Bodies.rectangle(BOARD_WIDTH/2, -wallThickness/2, BOARD_WIDTH + 100, wallThickness, { isStatic: true, restitution: 0.8 }),
            // Bottom wall
            Matter.Bodies.rectangle(BOARD_WIDTH/2, BOARD_HEIGHT + wallThickness/2, BOARD_WIDTH + 100, wallThickness, { isStatic: true, restitution: 0.8 }),
            // Left wall
            Matter.Bodies.rectangle(-wallThickness/2, BOARD_HEIGHT/2, wallThickness, BOARD_HEIGHT + 100, { isStatic: true, restitution: 0.8 }),
            // Right wall
            Matter.Bodies.rectangle(BOARD_WIDTH + wallThickness/2, BOARD_HEIGHT/2, wallThickness, BOARD_HEIGHT + 100, { isStatic: true, restitution: 0.8 })
        ];
        
        // Create attacker body (heavier, less bouncy)
        const attackerStartPos = gridToPixel(this.attackingPawn.gridX, this.attackingPawn.gridY);
        const attackerBody = Matter.Bodies.circle(
            attackerStartPos.x + CELL_SIZE / 2,
            attackerStartPos.y + CELL_SIZE / 2,
            CELL_SIZE * 0.35,
            {
                restitution: 0.1,  // Very little bounce
                friction: 0.8,     // High friction to stop quickly
                density: 0.01,     // Much heavier
                frictionAir: 0.05  // More air resistance to stop movement
            }
        );
        
        // Create target body (lighter, bouncier)
        const targetPos = gridToPixel(this.targetPawn.gridX, this.targetPawn.gridY);
        const targetBody = Matter.Bodies.circle(
            targetPos.x + CELL_SIZE / 2,
            targetPos.y + CELL_SIZE / 2,
            CELL_SIZE * 0.35,
            {
                isStatic: true,
                restitution: 0.8,   // Very bouncy
                friction: 0.02,     // Very low friction for sliding
                density: 0.001,     // Very light
                frictionAir: 0.015  // Some air resistance for eventual stopping
            }
        );
        
        Matter.World.add(tempEngine.world, [attackerBody, targetBody, ...walls]);
        
        // Add other pawns as static obstacles
        const otherPawnBodies = this.createPawnBodies(tempEngine, [this.attackingPawn, this.targetPawn]);
        
        // Store references for animation
        const attackingPawnRef = this.attackingPawn;
        const targetPawnRef = this.targetPawn;
        const originalAttackerPos = { x: attackingPawnRef.gridX, y: attackingPawnRef.gridY };
        const originalTargetPos = { x: targetPawnRef.gridX, y: targetPawnRef.gridY };
        
        // Calculate wind-up position (move backwards along attack line)
        const windupDistance = 20 + this.attackPower * 5; // Smaller wind-up
        const windupX = attackerStartPos.x + CELL_SIZE / 2 - normalizedDir.x * windupDistance;
        const windupY = attackerStartPos.y + CELL_SIZE / 2 - normalizedDir.y * windupDistance;
        
        // Animate the physics simulation
        gameState.isAnimating = true;
        let animationFrame = 0;
        const windupFrames = 15; // Shorter wind-up
        const attackFrames = 20; // Shorter attack run
        const bounceFrames = 200; // Longer bounce time for enemy
        const maxFrames = windupFrames + attackFrames + bounceFrames;
        let collisionOccurred = false;
        let windupComplete = false;
        let attackerStopped = false;
        
        const animate = () => {
            if (animationFrame >= maxFrames) {
                // Animation complete - handle game state updates
                this.handleAttackComplete(attackingPawnRef, targetPawnRef, originalTargetPos);
                gameState.isAnimating = false;
                return;
            }
            
            // Wind-up phase
            if (animationFrame < windupFrames) {
                const windupProgress = animationFrame / windupFrames;
                // Ease out for smooth wind-up
                const easedProgress = 1 - Math.pow(1 - windupProgress, 3);
                
                if (attackingPawnRef.pixiObject && !attackingPawnRef.pixiObject.destroyed) {
                    attackingPawnRef.pixiObject.x = attackerStartPos.x + CELL_SIZE / 2 + 
                        (windupX - (attackerStartPos.x + CELL_SIZE / 2)) * easedProgress;
                    attackingPawnRef.pixiObject.y = attackerStartPos.y + CELL_SIZE / 2 + 
                        (windupY - (attackerStartPos.y + CELL_SIZE / 2)) * easedProgress;
                }
                
                // Set attacker body position for physics
                Matter.Body.setPosition(attackerBody, {
                    x: attackerStartPos.x + CELL_SIZE / 2 + 
                        (windupX - (attackerStartPos.x + CELL_SIZE / 2)) * easedProgress,
                    y: attackerStartPos.y + CELL_SIZE / 2 + 
                        (windupY - (attackerStartPos.y + CELL_SIZE / 2)) * easedProgress
                });
            }
            
            // Launch phase - apply velocity after wind-up
            if (animationFrame === windupFrames && !windupComplete) {
                windupComplete = true;
                // Apply moderate velocity to attacker (just enough to reach target)
                const attackerSpeed = 0.3 + this.attackPower * 0.1; // Much slower
                Matter.Body.setVelocity(attackerBody, {
                    x: normalizedDir.x * magnitude * attackerSpeed,
                    y: normalizedDir.y * magnitude * attackerSpeed
                });
            }
            
            // Update physics after wind-up
            if (animationFrame >= windupFrames) {
                Matter.Engine.update(tempEngine, 1000 / 60);
            }
            
            // Check for collision
            const collision = Matter.Query.collides(attackerBody, [targetBody]);
            if (collision.length > 0 && !collisionOccurred) {
                collisionOccurred = true;
                
                // Make target dynamic after collision
                Matter.Body.setStatic(targetBody, false);
                
                // Calculate powerful impact force for enemy
                const impactForce = 2.5 + this.attackPower * 1.5; // Much stronger force
                
                // Apply massive velocity to target in drag direction
                Matter.Body.setVelocity(targetBody, {
                    x: normalizedDir.x * magnitude * impactForce,
                    y: normalizedDir.y * magnitude * impactForce
                });
                
                // Stop attacker almost completely
                Matter.Body.setVelocity(attackerBody, {
                    x: attackerBody.velocity.x * 0.05,
                    y: attackerBody.velocity.y * 0.05
                });
                
                // Make attacker very heavy and sticky after collision
                Matter.Body.set(attackerBody, {
                    frictionAir: 0.5,
                    friction: 0.9
                });
                
                // Add visual effects
                this.createImpactEffect(
                    (attackerBody.position.x + targetBody.position.x) / 2,
                    (attackerBody.position.y + targetBody.position.y) / 2
                );
                
                // Camera shake with intensity based on power
                if (typeof triggerCameraShake === 'function') {
                    triggerCameraShake(10 + this.attackPower * 5, 300);
                }
                
                // Sound is handled by game-logic.js to avoid duplication
                
                // Add spinning to target for dramatic effect
                Matter.Body.setAngularVelocity(targetBody, (Math.random() - 0.5) * 0.3);
            }
            
            // Update pawn positions based on physics bodies
            if (animationFrame >= windupFrames && attackingPawnRef.pixiObject && !attackingPawnRef.pixiObject.destroyed) {
                // Stop updating attacker position after collision + a few frames
                if (!collisionOccurred || animationFrame < windupFrames + attackFrames + 10) {
                    attackingPawnRef.pixiObject.x = attackerBody.position.x;
                    attackingPawnRef.pixiObject.y = attackerBody.position.y;
                } else if (!attackerStopped) {
                    // Move attacker to target's original position
                    attackerStopped = true;
                    const targetOriginalPos = gridToPixel(originalTargetPos.x, originalTargetPos.y);
                    attackingPawnRef.pixiObject.x = targetOriginalPos.x + CELL_SIZE / 2;
                    attackingPawnRef.pixiObject.y = targetOriginalPos.y + CELL_SIZE / 2;
                }
            }
            
            if (collisionOccurred && targetPawnRef.pixiObject && !targetPawnRef.pixiObject.destroyed) {
                targetPawnRef.pixiObject.x = targetBody.position.x;
                targetPawnRef.pixiObject.y = targetBody.position.y;
                targetPawnRef.pixiObject.rotation = targetBody.angle;
                
                // Fade out target pawn as it slows down
                const speed = Math.sqrt(targetBody.velocity.x * targetBody.velocity.x + targetBody.velocity.y * targetBody.velocity.y);
                if (speed < 1.0 && animationFrame > windupFrames + attackFrames + 100) {
                    targetPawnRef.pixiObject.alpha = Math.max(0, targetPawnRef.pixiObject.alpha - 0.03);
                }
            }
            
            animationFrame++;
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }

    createImpactEffect(x, y) {
        if (!app || !app.stage) return;
        
        const impactContainer = new PIXI.Container();
        
        // Create expanding circle effect
        for (let i = 0; i < 3; i++) {
            const circle = new PIXI.Graphics();
            circle.lineStyle(3 - i, 0xFFFF00, 1);
            circle.drawCircle(0, 0, 10);
            impactContainer.addChild(circle);
            
            // Animate expansion and fade
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

    handleAttackComplete(attackingPawn, targetPawn, originalTargetPos) {
        // Don't do anything here - let the game handle the actual attack
        // The physics simulation was just for visualization
        
        // Call the game's attack handler
        if (typeof handleAttackAction === 'function') {
            // Reset game state before calling attack handler
            gameState.isAnimating = false;
            
            // Ensure pawns are back at their original positions
            if (attackingPawn.pixiObject && !attackingPawn.pixiObject.destroyed) {
                const attackerPos = gridToPixel(attackingPawn.gridX, attackingPawn.gridY);
                attackingPawn.pixiObject.x = attackerPos.x + CELL_SIZE / 2;
                attackingPawn.pixiObject.y = attackerPos.y + CELL_SIZE / 2;
            }
            
            if (targetPawn.pixiObject && !targetPawn.pixiObject.destroyed) {
                const targetPos = gridToPixel(targetPawn.gridX, targetPawn.gridY);
                targetPawn.pixiObject.x = targetPos.x + CELL_SIZE / 2;
                targetPawn.pixiObject.y = targetPos.y + CELL_SIZE / 2;
            }
            
            // Call the normal attack handler
            handleAttackAction(attackingPawn, targetPawn);
        } else {
            console.error("handleAttackAction function not available");
            gameState.isAnimating = false;
        }
        
        // Clear the attack system state
        this.clearAttackLine();
    }

    clearAttackLine() {
        if (this.attackLineGraphics) {
            this.attackLineGraphics.clear();
        }
        this.isDrawingAttack = false;
        this.startPoint = null;
        this.endPoint = null;
        this.attackingPawn = null;
        this.targetPawn = null;
        this.attackPower = 0;
        this.isDragging = false;
        
        // Update debug display
        this.updateDebug();
    }

    createDebugElement() {
        // Create a debug div to show drag status
        const existing = document.getElementById('physics-attack-debug');
        if (existing) existing.remove();
        
        const debugDiv = document.createElement('div');
        debugDiv.id = 'physics-attack-debug';
        debugDiv.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
        `;
        document.body.appendChild(debugDiv);
        this.debugElement = debugDiv;
    }
    
    updateDebug() {
        if (!this.debugElement) return;
        
        if (this.isDrawingAttack) {
            this.debugElement.style.display = 'block';
            this.debugElement.innerHTML = `
                <strong>PHYSICS ATTACK ACTIVE</strong><br>
                Dragging: ${this.isDragging ? 'YES' : 'NO'}<br>
                Start: ${this.startPoint ? `(${Math.round(this.startPoint.x)}, ${Math.round(this.startPoint.y)})` : 'none'}<br>
                End: ${this.endPoint ? `(${Math.round(this.endPoint.x)}, ${Math.round(this.endPoint.y)})` : 'none'}<br>
                Power: ${this.attackPower.toFixed(2)}<br>
                Graphics: ${this.attackLineGraphics ? 'exists' : 'missing'}
            `;
        } else {
            this.debugElement.style.display = 'none';
        }
    }
    
    destroy() {
        if (this.runner) {
            Matter.Runner.stop(this.runner);
        }
        if (this.attackLineGraphics && !this.attackLineGraphics.destroyed) {
            this.attackLineGraphics.destroy();
        }
        if (this.debugElement) {
            this.debugElement.remove();
        }
        this.physicsBodies.clear();
    }
}

// Create global instance
let physicsAttackSystem = null;

// Initialize when game starts
function initializePhysicsAttack() {
    if (!physicsAttackSystem) {
        physicsAttackSystem = new PhysicsAttackSystem();
        console.log("Physics attack system created");
    }
}

// Clean up when game ends
function destroyPhysicsAttack() {
    if (physicsAttackSystem) {
        physicsAttackSystem.destroy();
        physicsAttackSystem = null;
    }
}