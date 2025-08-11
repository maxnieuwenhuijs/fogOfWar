// Simplified Physics Attack System - Complete Rewrite
class PhysicsAttackSystemV2 {
    constructor() {
        this.attackLine = null;
        this.isDrawing = false;
        this.startPoint = null;
        this.endPoint = null;
        this.attackPower = 0;
        this.attackingPawn = null;
        this.targetPawn = null;

        this.initialize();
    }

    initialize() {
        console.log("🚀 Physics Attack System V2 Initialized");
        // Debug display removed - only showing red line
    }

    // Debug display removed - only red line visualization

    updateDebug(message) {
        // Debug display removed - only red line visualization
    }

    hideDebug() {
        // Debug display removed - only red line visualization
    }

    startDrag(x, y, attacker, target) {
        console.log("🎯 Starting physics drag", { attacker: attacker.id, target: target.id });

        this.isDrawing = true;
        this.startPoint = { x, y };
        this.endPoint = { x, y };
        this.attackingPawn = attacker;
        this.targetPawn = target;
        this.dragStartTime = Date.now(); // Track when drag started
        this.hasMoved = false; // Track if we've actually moved

        // Create attack line graphics
        if (!this.attackLine) {
            this.attackLine = new PIXI.Graphics();
            if (app && app.stage) {
                app.stage.addChild(this.attackLine);
            }
        }

        // Bring to front
        if (app && app.stage && this.attackLine) {
            app.stage.setChildIndex(this.attackLine, app.stage.children.length - 1);
        }
    }

    updateDrag(x, y) {
        if (!this.isDrawing) return;

        this.endPoint = { x, y };

        // Calculate power based on distance
        const dx = this.endPoint.x - this.startPoint.x;
        const dy = this.endPoint.y - this.startPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Track if we've moved enough to consider this a real drag
        const MIN_DRAG_DISTANCE = 30; // Minimum pixels to consider as drag
        if (distance > MIN_DRAG_DISTANCE) {
            this.hasMoved = true;
        }

        // Get settings from test panel
        const settings = window.physicsTestPanel?.settings || {
            powerDivisor: 100,
            maxPower: 15
        };
        this.attackPower = Math.min(distance / settings.powerDivisor, settings.maxPower);

        // Draw the attack line
        if (this.attackLine) {
            this.attackLine.clear();

            // Main line - thick and red
            this.attackLine.lineStyle(6 + this.attackPower, 0xFF0000, 1);
            this.attackLine.moveTo(this.startPoint.x, this.startPoint.y);
            this.attackLine.lineTo(this.endPoint.x, this.endPoint.y);

            // Arrow head
            const angle = Math.atan2(dy, dx);
            const arrowSize = 20 + this.attackPower * 2;

            this.attackLine.lineStyle(4 + this.attackPower, 0xFF0000, 1);
            this.attackLine.moveTo(this.endPoint.x, this.endPoint.y);
            this.attackLine.lineTo(
                this.endPoint.x - arrowSize * Math.cos(angle - 0.5),
                this.endPoint.y - arrowSize * Math.sin(angle - 0.5)
            );
            this.attackLine.moveTo(this.endPoint.x, this.endPoint.y);
            this.attackLine.lineTo(
                this.endPoint.x - arrowSize * Math.cos(angle + 0.5),
                this.endPoint.y - arrowSize * Math.sin(angle + 0.5)
            );

            // Power indicator circle
            const midX = (this.startPoint.x + this.endPoint.x) / 2;
            const midY = (this.startPoint.y + this.endPoint.y) / 2;
            this.attackLine.beginFill(0xFFFF00, 1);
            this.attackLine.drawCircle(midX, midY, 10 + this.attackPower * 2);
            this.attackLine.endFill();
        }
    }

    endDrag() {
        if (!this.isDrawing) return;

        const dragDuration = Date.now() - this.dragStartTime;
        console.log("🏁 Ending drag", {
            power: this.attackPower.toFixed(2),
            hasMoved: this.hasMoved,
            duration: dragDuration + "ms"
        });

        // Clear the line
        if (this.attackLine) {
            this.attackLine.clear();
        }

        // Only execute attack if:
        // 1. We actually moved (not just a click)
        // 2. We have minimum power
        // 3. Drag lasted minimum time (prevents accidental quick clicks)
        const settings = window.physicsTestPanel?.settings || {
            minPowerThreshold: 1.0  // Increased from 0.2 to 1.0 
        };
        const MIN_DRAG_TIME = 100; // Minimum milliseconds for drag

        if (this.hasMoved &&
            this.attackPower > settings.minPowerThreshold &&
            dragDuration > MIN_DRAG_TIME) {
            console.log("✅ Valid drag - executing attack");
            this.executeAttack();
        } else {
            console.log("❌ Invalid drag - attack cancelled", {
                hasMoved: this.hasMoved,
                power: this.attackPower,
                minPower: settings.minPowerThreshold,
                duration: dragDuration,
                minDuration: MIN_DRAG_TIME
            });
        }

        this.isDrawing = false;
        this.hasMoved = false;
    }

    executeAttack() {
        console.log("💥 EXECUTING PHYSICS ATTACK!");
        console.log("Attack Power:", this.attackPower.toFixed(2));

        const attacker = this.attackingPawn;
        const target = this.targetPawn;

        if (!attacker || !target) {
            console.error("Missing attacker or target!");
            return;
        }

        // Ensure target is visible
        if (target.pixiObject && !target.pixiObject.destroyed) {
            target.pixiObject.visible = true;
            target.pixiObject.alpha = 1;
            console.log("Target pawn visibility ensured");
        }

        // Calculate attack direction (from start to end of drag)
        const dx = this.endPoint.x - this.startPoint.x;
        const dy = this.endPoint.y - this.startPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / distance;
        const dirY = dy / distance;

        console.log("Attack direction:", { dirX, dirY, power: this.attackPower });

        // Send attack to other players for synchronization
        // Send both the normalized direction AND the absolute coordinates for proper sync
        if (window.physicsAttackSync && !gameState.testMode) {
            window.physicsAttackSync.sendPhysicsAttack(attacker, target, this.attackPower, {
                x: dirX,
                y: dirY,
                startPoint: { x: this.startPoint.x, y: this.startPoint.y },
                endPoint: { x: this.endPoint.x, y: this.endPoint.y }
            });
        }

        // Get positions
        const attackerPos = gridToPixel(attacker.gridX, attacker.gridY);
        const targetPos = gridToPixel(target.gridX, target.gridY);

        // Create physics engine
        const engine = Matter.Engine.create();
        engine.world.gravity.y = 0; // No gravity - top down view

        // Create walls
        const walls = [
            Matter.Bodies.rectangle(BOARD_WIDTH / 2, -25, BOARD_WIDTH + 100, 50, { isStatic: true, restitution: 0.9 }),
            Matter.Bodies.rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT + 25, BOARD_WIDTH + 100, 50, { isStatic: true, restitution: 0.9 }),
            Matter.Bodies.rectangle(-25, BOARD_HEIGHT / 2, 50, BOARD_HEIGHT + 100, { isStatic: true, restitution: 0.9 }),
            Matter.Bodies.rectangle(BOARD_WIDTH + 25, BOARD_HEIGHT / 2, 50, BOARD_HEIGHT + 100, { isStatic: true, restitution: 0.9 })
        ];
        Matter.World.add(engine.world, walls);

        // Get test settings from panel
        const settings = window.physicsTestPanel?.settings || {
            attackerDensity: 0.05,
            attackerFrictionAir: 0,
            enemyDensity: 0.0005,
            enemyFrictionAir: 0.005,
            enemyRestitution: 0.75,
            enemyFriction: 0,
            attackerSpeed: 8,
            maxFrames: 120,
            baseForce: 3,
            forceMultiplier: 2,
            fadeStartSpeed: 5,
            fadeRate: 0.1
        };

        // Create attacker body (heavy, slow)
        const attackerBody = Matter.Bodies.circle(
            attackerPos.x + CELL_SIZE / 2,
            attackerPos.y + CELL_SIZE / 2,
            CELL_SIZE * 0.4,
            {
                density: settings.attackerDensity,
                frictionAir: settings.attackerFrictionAir,
                restitution: 0
            }
        );

        // Create target body (light, bouncy)
        const targetBody = Matter.Bodies.circle(
            targetPos.x + CELL_SIZE / 2,
            targetPos.y + CELL_SIZE / 2,
            CELL_SIZE * 0.4,
            {
                density: settings.enemyDensity,
                frictionAir: settings.enemyFrictionAir,
                restitution: settings.enemyRestitution,
                friction: settings.enemyFriction,
                slop: 0 // More precise collisions
            }
        );

        Matter.World.add(engine.world, [attackerBody, targetBody]);

        // Optional: Add other pawns as obstacles (commented out for simpler physics)
        // this.addOtherPawnsAsObstacles(engine, [attacker, target]);

        // Set initial velocities - make attacker move faster to target
        const attackDx = targetBody.position.x - attackerBody.position.x;
        const attackDy = targetBody.position.y - attackerBody.position.y;
        const attackDist = Math.sqrt(attackDx * attackDx + attackDy * attackDy);
        const attackerSpeed = settings.attackerSpeed || 8;
        Matter.Body.setVelocity(attackerBody, {
            x: (attackDx / attackDist) * attackerSpeed,
            y: (attackDy / attackDist) * attackerSpeed
        });

        // Animation variables
        gameState.isAnimating = true;
        let frame = 0;
        const maxFrames = settings.maxFrames || 120;
        let hitOccurred = false;
        const originalAttackerPos = { x: attacker.gridX, y: attacker.gridY };
        const originalTargetPos = { x: target.gridX, y: target.gridY };

        const animate = () => {
            frame++;

            if (frame > maxFrames || !gameState.isAnimating) {
                // Cleanup
                this.finishAttack(attacker, target, originalTargetPos);
                return;
            }

            // Update physics
            Matter.Engine.update(engine, 16.666);

            // Check for collision
            const collision = Matter.Query.collides(attackerBody, [targetBody]);
            if (collision.length > 0 && !hitOccurred) {
                hitOccurred = true;
                console.log("💥 COLLISION DETECTED!");

                // Apply controlled impulse to target
                const impulsePower = settings.baseForce + this.attackPower * settings.forceMultiplier;
                Matter.Body.setVelocity(targetBody, {
                    x: dirX * impulsePower,
                    y: dirY * impulsePower
                });

                // Stop attacker
                Matter.Body.setVelocity(attackerBody, { x: 0, y: 0 });
                attackerBody.isStatic = true;

                // Effects
                this.createImpactEffect(
                    (attackerBody.position.x + targetBody.position.x) / 2,
                    (attackerBody.position.y + targetBody.position.y) / 2
                );

                // Camera shake
                if (typeof triggerCameraShake === 'function') {
                    triggerCameraShake(15 + this.attackPower * 3, 400);
                }

                // Sound is handled by game-logic.js to avoid duplication
            }

            // Update visual positions
            if (attacker.pixiObject && !attacker.pixiObject.destroyed) {
                if (!hitOccurred || frame < 30) {
                    attacker.pixiObject.x = attackerBody.position.x;
                    attacker.pixiObject.y = attackerBody.position.y;
                } else {
                    // Move attacker to target's original position after hit
                    const pos = gridToPixel(originalTargetPos.x, originalTargetPos.y);
                    attacker.pixiObject.x = pos.x + CELL_SIZE / 2;
                    attacker.pixiObject.y = pos.y + CELL_SIZE / 2;
                }
            }

            if (target.pixiObject && !target.pixiObject.destroyed) {
                // Always update target position from physics body
                target.pixiObject.x = targetBody.position.x;
                target.pixiObject.y = targetBody.position.y;

                // Debug log every 30 frames
                if (frame % 30 === 0) {
                    console.log(`Frame ${frame}: Target at (${targetBody.position.x.toFixed(0)}, ${targetBody.position.y.toFixed(0)}), velocity: ${Math.sqrt(targetBody.velocity.x * targetBody.velocity.x + targetBody.velocity.y * targetBody.velocity.y).toFixed(2)}`);
                }

                // Add rotation for fun
                if (hitOccurred) {
                    target.pixiObject.rotation = frame * 0.15;
                }

                // Fade out when slow
                const speed = Math.sqrt(
                    targetBody.velocity.x * targetBody.velocity.x +
                    targetBody.velocity.y * targetBody.velocity.y
                );
                if (speed < settings.fadeStartSpeed && frame > 80) {
                    target.pixiObject.alpha = Math.max(0, target.pixiObject.alpha - settings.fadeRate);
                }
            }

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    createImpactEffect(x, y) {
        if (!app || !app.stage) return;

        // Create multiple expanding rings
        for (let i = 0; i < 5; i++) {
            const ring = new PIXI.Graphics();
            app.stage.addChild(ring);

            let scale = 1;
            const animate = () => {
                scale += 0.3;
                ring.clear();
                ring.lineStyle(4 - i * 0.5, 0xFFFF00, 1 - scale / 10);
                ring.drawCircle(x, y, scale * (10 + i * 5));

                if (scale < 10) {
                    requestAnimationFrame(animate);
                } else {
                    app.stage.removeChild(ring);
                    ring.destroy();
                }
            };

            setTimeout(() => animate(), i * 50);
        }
    }

    finishAttack(attacker, target, originalTargetPos) {
        console.log("✅ Attack animation complete");

        // Move attacker to target's original position
        if (attacker.pixiObject && !attacker.pixiObject.destroyed) {
            const pos = gridToPixel(originalTargetPos.x, originalTargetPos.y);
            attacker.pixiObject.x = pos.x + CELL_SIZE / 2;
            attacker.pixiObject.y = pos.y + CELL_SIZE / 2;
            attacker.pixiObject.rotation = 0;
            attacker.gridX = originalTargetPos.x;
            attacker.gridY = originalTargetPos.y;
        }

        // Call game's normal attack handler
        gameState.isAnimating = false;
        if (typeof handleAttackAction === 'function') {
            handleAttackAction(attacker, target);
        }

        // Cleanup
        this.attackingPawn = null;
        this.targetPawn = null;
        this.attackPower = 0;
    }

    addOtherPawnsAsObstacles(engine, excludePawns) {
        // Method to add other pawns as static obstacles
        // Currently unused but available if needed
        const obstacles = [];

        if (typeof gameState !== 'undefined' && gameState.players) {
            for (const player of Object.values(gameState.players)) {
                if (player.pawns) {
                    for (const pawn of player.pawns) {
                        if (excludePawns.some(ep => ep.id === pawn.id)) continue;
                        if (!pawn.isActive || !pawn.pixiObject) continue;

                        const pos = gridToPixel(pawn.gridX, pawn.gridY);
                        const obstacle = Matter.Bodies.rectangle(
                            pos.x + CELL_SIZE / 2,
                            pos.y + CELL_SIZE / 2,
                            CELL_SIZE * 0.7,
                            CELL_SIZE * 0.7,
                            {
                                isStatic: true,
                                restitution: 0.5
                            }
                        );
                        obstacles.push(obstacle);
                    }
                }
            }
        }

        if (obstacles.length > 0) {
            Matter.World.add(engine.world, obstacles);
        }

        return obstacles;
    }

    destroy() {
        if (this.attackLine && !this.attackLine.destroyed) {
            this.attackLine.destroy();
        }
        // Debug display removed
    }
}

// Replace the old system
if (typeof physicsAttackSystem !== 'undefined' && physicsAttackSystem) {
    physicsAttackSystem.destroy();
}

// Create new instance
window.physicsAttackSystem = new PhysicsAttackSystemV2();
console.log("✨ Physics Attack System V2 Ready!");