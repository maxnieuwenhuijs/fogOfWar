// --- START OF FILE public/js/game-classes.js ---

class Pawn {
  constructor(id, player, gridX, gridY) {
    this.id = id;
    this.player = player;
    this.gridX = gridX;
    this.gridY = gridY;
    this.pixiObject = new PIXI.Container();
    this.graphics = null; // Main pawn visual (Sprite or Graphics)

    // --- Stats Display Elements (Directly on Pawn) ---
    this.hpText = null;
    this.staminaText = null;
    this.attackText = null;
    // --- Bar Display Elements ---
    this.staminaBarContainer = null;
    this.hpBarContainer = null;
    this.staminaBars = [];
    this.hpBars = [];
    // --- Combination Icon ---
    this.combinationIconSprite = null; // Re-added

    this.isActive = false;
    this.currentHP = null;
    this.linkedCard = null;
    this.hasActedThisCycle = false;
    this.remainingStamina = null;
  }

  createVisual() {
    const radius = CELL_SIZE * 0.4;
    const STROKE_THICKNESS = 2;

    // --- Constants for stats display ---
    const STATS_FONT_SIZE = 10;
    const STATS_TEXT_COLOR = 0xFFFFFF;
    const STATS_TEXT_STROKE = 0x000000;
    const STATS_TEXT_STROKE_THICKNESS = 2.5;
    const STATS_PADDING = 2; // Padding from the edge

    // --- Constants for Combination Icon ---
    const CENTRAL_ICON_DISPLAY_SIZE = CELL_SIZE * 0.55;

    // Shadow for hover effect
    this.shadow = new PIXI.Graphics();
    this.shadow.beginFill(0x000000, 0.3);
    this.shadow.drawEllipse(0, radius * 0.8, radius * 0.8, radius * 0.3);
    this.shadow.endFill();
    this.shadow.visible = false;
    this.shadow.alpha = 0;
    this.pixiObject.addChild(this.shadow);

    // --- Main Pawn Sprite ---
    const textureAlias = this.player === PLAYER_1 ? 'p1_piece' : 'p2_piece';
    let texture = ICON_TEXTURES && ICON_TEXTURES[textureAlias];
    if (!texture) {
      // Best-effort on-demand load using a direct path (works even if preloader skipped)
      try {
        const path = this.player === PLAYER_1 ? 'assets/images/p1_piece.png' : 'assets/images/p2_piece.png';
        texture = PIXI.Texture.from(path);
        // Store it for future use if it loaded successfully
        if (texture && texture.valid && texture.width > 0) {
          ICON_TEXTURES[textureAlias] = texture;
        } else {
          // If texture isn't valid yet, wait for it to load
          texture.on('update', () => {
            if (texture.valid && texture.width > 0) {
              ICON_TEXTURES[textureAlias] = texture;
              // Update the sprite if it was created with a placeholder
              if (this.graphics && this.graphics instanceof PIXI.Sprite) {
                this.graphics.texture = texture;
                const spriteScale = (CELL_SIZE * 0.8) / Math.max(texture.width, texture.height);
                this.graphics.scale.set(spriteScale);
              }
            }
          });
        }
      } catch (_) { /* ignore */ }
    }
    if (!texture || !texture.valid || texture.width === 0) {
      console.warn(`Texture not ready for ${textureAlias}. Rendering colored circle fallback.`);
      this.graphics = new PIXI.Graphics();
      const color = this.player === PLAYER_1 ? COLORS.player1 : COLORS.player2;
      this.graphics.beginFill(color);
      this.graphics.lineStyle(1, 0x000000, 0.3);
      this.graphics.drawCircle(0, 0, radius);
      this.graphics.endFill();
      
      // Try to load the texture asynchronously and replace the circle when ready
      const asyncPath = this.player === PLAYER_1 ? 'assets/images/p1_piece.png' : 'assets/images/p2_piece.png';
      PIXI.Assets.load(asyncPath).then((loadedTexture) => {
        if (loadedTexture && loadedTexture.valid) {
          // Store the texture for future use
          ICON_TEXTURES[textureAlias] = loadedTexture;
          
          // Replace the graphics with a sprite
          const index = this.pixiObject.getChildIndex(this.graphics);
          this.pixiObject.removeChild(this.graphics);
          
          this.graphics = new PIXI.Sprite(loadedTexture);
          this.graphics.anchor.set(0.5);
          const spriteScale = (CELL_SIZE * 0.8) / Math.max(loadedTexture.width, loadedTexture.height);
          this.graphics.scale.set(spriteScale);
          
          // Add at the same position in the hierarchy
          this.pixiObject.addChildAt(this.graphics, index);
          console.log(`Successfully loaded and replaced texture for ${textureAlias}`);
        }
      }).catch((err) => {
        console.error(`Failed to load texture for ${textureAlias}:`, err);
      });
    } else {
      this.graphics = new PIXI.Sprite(texture);
      this.graphics.anchor.set(0.5);
      const spriteScale = (CELL_SIZE * 0.8) / Math.max(texture.width, texture.height);
      this.graphics.scale.set(spriteScale);
    }
    this.pixiObject.addChild(this.graphics);

    // --- Central Combination Icon Sprite (Re-added) ---
    this.combinationIconSprite = new PIXI.Sprite();
    this.combinationIconSprite.anchor.set(0.5);
    this.combinationIconSprite.width = CENTRAL_ICON_DISPLAY_SIZE;
    this.combinationIconSprite.height = CENTRAL_ICON_DISPLAY_SIZE;
    this.combinationIconSprite.position.set(0, 0);
    this.combinationIconSprite.visible = false; // Initially hidden
    this.pixiObject.addChild(this.combinationIconSprite); // Add ON TOP of pawn graphic

    // --- Create Stats Text Objects (Positioned in corners) ---
    const statsTextStyle = new PIXI.TextStyle({
      fontFamily: "Arial",
      fontSize: STATS_FONT_SIZE,
      fill: STATS_TEXT_COLOR,
      stroke: STATS_TEXT_STROKE,
      strokeThickness: STATS_TEXT_STROKE_THICKNESS,
      align: "left",
    });

    // HP (Top Left)
    this.hpText = new PIXI.Text("🛡️ ?", statsTextStyle);
    this.hpText.anchor.set(0, 0);
    this.hpText.position.set(-radius + STATS_PADDING, -radius + STATS_PADDING);
    this.hpText.visible = false;
    this.pixiObject.addChild(this.hpText);

    // Speed (Bottom Left)
    this.staminaText = new PIXI.Text("🐎 ?", statsTextStyle);
    this.staminaText.anchor.set(0, 1);
    this.staminaText.position.set(-radius + STATS_PADDING, radius - STATS_PADDING);
    this.staminaText.visible = false;
    this.pixiObject.addChild(this.staminaText);

    // Attack (Top Right)
    this.attackText = new PIXI.Text("⚔️ ?", statsTextStyle);
    this.attackText.anchor.set(1, 0);
    this.attackText.position.set(radius - STATS_PADDING, -radius + STATS_PADDING);
    this.attackText.visible = false;
    this.pixiObject.addChild(this.attackText);

    // --- Create Bar Displays ---
    this.staminaBarContainer = new PIXI.Container();
    this.hpBarContainer = new PIXI.Container();
    this.pixiObject.addChild(this.staminaBarContainer);
    this.pixiObject.addChild(this.hpBarContainer);

    const BAR_WIDTH = 4;
    const BAR_HEIGHT = 6;
    const BAR_SPACING = 2;
    const TOTAL_STAMINA_BARS = 5; // Changed from 7 to 5
    const TOTAL_HP_BARS = 5;

    // HP Bar (Left side - switched position)
    for (let i = 0; i < TOTAL_HP_BARS; i++) {
      const bar = new PIXI.Graphics();
      bar.position.set(0, i * (BAR_HEIGHT + BAR_SPACING));
      this.hpBarContainer.addChild(bar);
      this.hpBars.push(bar);
    }
    this.hpBarContainer.x = -radius - BAR_WIDTH + 1; // Left side
    this.hpBarContainer.y = -((TOTAL_HP_BARS * (BAR_HEIGHT + BAR_SPACING)) - BAR_SPACING) / 2;

    // Stamina Bar (Right side - switched position)
    for (let i = 0; i < TOTAL_STAMINA_BARS; i++) {
      const bar = new PIXI.Graphics();
      bar.position.set(0, i * (BAR_HEIGHT + BAR_SPACING));
      this.staminaBarContainer.addChild(bar);
      this.staminaBars.push(bar);
    }
    this.staminaBarContainer.x = radius - 1; // Right side
    this.staminaBarContainer.y = -((TOTAL_STAMINA_BARS * (BAR_HEIGHT + BAR_SPACING)) - BAR_SPACING) / 2;

    this.staminaBarContainer.visible = false;
    this.hpBarContainer.visible = false;

    // --- Create Attack Stats Display (Center Bottom) ---
    this.attackStatsText = new PIXI.Text("", {
      fontFamily: "Arial",
      fontSize: 11,
      fill: 0xFFFFFF, // White
      stroke: 0x000000, // Black outline
      strokeThickness: 2,
      align: "center"
    });
    this.attackStatsText.anchor.set(0.5, 0); // Center horizontally, top vertically
    this.attackStatsText.position.set(0, radius - 2); // Center bottom of pawn
    this.attackStatsText.visible = false;
    this.pixiObject.addChild(this.attackStatsText);

    // --- Position the whole pawn container ---
    const pixelPos = gridToPixel(this.gridX, this.gridY);
    this.pixiObject.x = pixelPos.x + CELL_SIZE / 2;
    this.pixiObject.y = pixelPos.y + CELL_SIZE / 2;

    // --- Interaction Setup ---
    this.pixiObject.name = this.id;
    this.pixiObject.pawnRef = this; // allow global event logs to identify pawn
    this.pixiObject.eventMode = "static";
    // Expand hit area to be at least the pawn circle size (helps on small canvases/DPR)
    try {
      const r = CELL_SIZE * 0.5;
      this.pixiObject.hitArea = new PIXI.Circle(0, 0, r);
    } catch (_) { }
    this.pixiObject.cursor = CURSOR_POINTER;
    this.pixiObject.on("pointerdown", (event) => {
      if (gameState.isAnimating || gameState.currentPhase === "GAME_OVER") return;
      event.stopPropagation();

      // Physics attack drag removed

      // Normal pawn click handling
      if (typeof onPawnClick === "function") onPawnClick(this);
    });

    this.pixiObject.on("pointerover", (event) => {
      if (gameState.isAnimating) return;
      // Hover logic for physics attack removed
    });

    this.pixiObject.on("pointerout", (event) => {
      if (gameState.isAnimating) return;
      if (this.player !== gameState.playerNumber && gameState.currentPhase === "AWAITING_ACTION_TARGET") {
        if (typeof onEnemyPawnOut === "function") onEnemyPawnOut(this);
      }
    });
    // Add tooltip hover listeners
    this.pixiObject.on('pointerover', (event) => this.showTooltip(event));
    this.pixiObject.on('pointerout', () => this.hideTooltip());


    // --- Add to stage ---
    if (typeof app !== "undefined" && app?.stage) {
      app.stage.addChild(this.pixiObject);
    } else {
      console.error(`Cannot add pawn ${this.id} visual to stage: Pixi app not ready.`);
    }
  }

  updateStatsDisplay(card, currentHPToShow = null) {
    // --- Update Stats Text (Always update content, but hide visibility) ---
    if (
      !card ||
      !this.hpText ||
      !this.staminaText ||
      !this.attackText
    ) {
      // Ensure text is hidden if no card or text objects
      if (this.hpText) this.hpText.visible = false;
      if (this.staminaText) this.staminaText.visible = false;
      if (this.attackText) this.attackText.visible = false;
    } else {
      // Update text content but keep it hidden
      const hpDisplayVal = currentHPToShow !== null ? currentHPToShow : card.hp;
      const staminaDisplayVal = this.remainingStamina ?? card.stamina;
      this.hpText.text = `🛡️ ${hpDisplayVal}`;
      this.staminaText.text = `🐎 ${staminaDisplayVal}`;
      this.attackText.text = `⚔️ ${card.attack}`;
      // Hide stats text
      this.hpText.visible = false;
      if (this.staminaText) this.staminaText.visible = false;
      this.attackText.visible = false;
    }

    // --- Update Central Combination Icon ---
    if (card && this.combinationIconSprite) {
      const statKey = `h${card.hp}_s${card.stamina}_a${card.attack}`;
      const iconAlias = STAT_COMBINATION_TO_ICON_ALIAS[statKey];
      if (iconAlias) {
        let texture = ICON_TEXTURES && ICON_TEXTURES[iconAlias];
        if (!texture) {
          try {
            const path = typeof getCombinationIconPath === 'function' ? getCombinationIconPath(iconAlias) : null;
            if (path) {
              texture = PIXI.Texture.from(path);
              if (texture && ICON_TEXTURES) ICON_TEXTURES[iconAlias] = texture;
            }
          } catch (_) { }
        }
        if (texture) {
          this.combinationIconSprite.texture = texture;
          this.combinationIconSprite.visible = true; // Show combo icon
          this.combinationIconSprite.alpha = 1;
          // *** KEEP text stats visible ***
          // if(this.hpText) this.hpText.visible = false; // Don't hide
          // if(this.speedText) this.speedText.visible = false; // Don't hide
          // if(this.attackText) this.attackText.visible = false; // Don't hide
        } else {
          // Texture not found, hide combo icon, text stats remain visible (set above)
          this.combinationIconSprite.visible = false;
        }
      } else {
        // No alias found, hide combo icon, text stats remain visible (set above)
        this.combinationIconSprite.visible = false;
      }
    } else {
      // Hide combo icon if no card or sprite doesn't exist
      if (this.combinationIconSprite) this.combinationIconSprite.visible = false;
    }

    // Set logical HP if not already set
    if (this.currentHP === null && card?.hp) {
      this.currentHP = card.hp;
    }
    this.updateBars();
  }


  hideStatsDisplay() {
    // Hide text stats and combo icon
    if (this.hpText) this.hpText.visible = false;
    if (this.staminaText) this.staminaText.visible = false;
    if (this.attackText) this.attackText.visible = false;
    if (this.combinationIconSprite) this.combinationIconSprite.visible = false;
    this.currentHP = null; // Reset logical HP
  }

  setHighlight(highlight = true) {
    if (!this.graphics) return; // Check if graphics/sprite exists

    // Use tint for highlighting sprites, revert border for fallback circles
    if (this.graphics instanceof PIXI.Sprite) {
      this.graphics.tint = highlight ? 0xFFFF00 : 0xFFFFFF; // Yellow tint for highlight, white otherwise
    } else if (this.graphics instanceof PIXI.Graphics) {
      // Fallback for circle if texture failed
      this.graphics.clear();
      if (highlight) {
        this.graphics.lineStyle(3, COLORS.activeHighlight, 1);
      } else {
        this.graphics.lineStyle(1, 0x000000, 0.3);
      }
      const color = this.player === PLAYER_1 ? COLORS.player1 : COLORS.player2;
      const radius = CELL_SIZE * 0.4;
      this.graphics.beginFill(color);
      this.graphics.drawCircle(0, 0, radius);
      this.graphics.endFill();
    }
  }


  updatePosition(newGridX, newGridY) {
    this.gridX = newGridX;
    this.gridY = newGridY;
    if (this.pixiObject) {
      const p = gridToPixel(this.gridX, this.gridY);
      this.pixiObject.x = p.x + CELL_SIZE / 2;
      this.pixiObject.y = p.y + CELL_SIZE / 2;
    }
  }

  animateMoveTo(newGridX, newGridY, onComplete = null) {
    if (!this.pixiObject || this.pixiObject.destroyed) {
      if (onComplete) onComplete();
      return;
    }
    const startX = this.pixiObject.x;
    const startY = this.pixiObject.y;
    const targetPos = gridToPixel(newGridX, newGridY);
    const targetX = targetPos.x + CELL_SIZE / 2;
    const targetY = targetPos.y + CELL_SIZE / 2;
    this.gridX = newGridX;
    this.gridY = newGridY;
    if (startX === targetX && startY === targetY) {
      if (onComplete) onComplete();
      return;
    }
    gameState.isAnimating = true;
    const duration = 300;
    const startTime = Date.now();
    const animate = () => {
      if (!this.pixiObject || this.pixiObject.destroyed) {
        gameState.isAnimating = false;
        if (onComplete) onComplete();
        return;
      }
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      this.pixiObject.x = startX + (targetX - startX) * easeProgress;
      this.pixiObject.y = startY + (targetY - startY) * easeProgress;
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.pixiObject.x = targetX;
        this.pixiObject.y = targetY;
        gameState.isAnimating = false;
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(animate);
  }

  destroyVisual() {
    if (this.pixiObject && !this.pixiObject.destroyed) {
      if (this.pixiObject.parent) {
        this.pixiObject.parent.removeChild(this.pixiObject);
      }
      this.pixiObject.destroy({ children: true });
      this.pixiObject = null;
      this.graphics = null;
      // Nullify new stats properties
      this.hpText = null;
      this.staminaText = null;
      this.attackText = null;
      this.combinationIconSprite = null; // Nullify combo icon too
    }
  }

  updateBars() {
    try { console.log("[Pawn.updateBars]", { id: this.id, active: this.isActive, hasCard: !!this.linkedCard, rs: this.remainingStamina, hp: this.currentHP }); } catch (_) { }
    // If visual is already destroyed or missing, skip
    if (!this.pixiObject || this.pixiObject.destroyed) {
      return;
    }
    if (!this.isActive || !this.linkedCard) {
      this.staminaBarContainer.visible = false;
      this.hpBarContainer.visible = false;
      if (this.attackStatsText) this.attackStatsText.visible = false;
      return;
    }

    this.staminaBarContainer.visible = true;
    this.hpBarContainer.visible = true;

    // Show attack stats in center bottom
    if (this.attackStatsText && this.linkedCard) {
      this.attackStatsText.text = this.linkedCard.attack || "0";
      this.attackStatsText.visible = true;
    }

    const BAR_WIDTH = 4;
    const BAR_HEIGHT = 6;
    const DEPLETED_COLOR = 0x333333; // Dark Grey
    const HP_COLOR = 0xFF4500; // Red/Pink
    const STAMINA_GREEN_COLOR = 0x00FF00;
    const STAMINA_RED_COLOR = 0xFF0000;

    // Update HP Bar
    const maxHP = this.linkedCard.hp || 5;
    for (let i = 0; i < this.hpBars.length; i++) {
      const bar = this.hpBars[i];
      if (!bar || bar.destroyed) continue;
      bar.clear();
      const color = (this.hpBars.length - i) <= this.currentHP ? HP_COLOR : DEPLETED_COLOR;
      bar.beginFill(color);
      bar.drawRect(0, 0, BAR_WIDTH, BAR_HEIGHT);
      bar.endFill();
    }

    // Update Stamina Bar with gradient colors
    for (let i = 0; i < this.staminaBars.length; i++) {
      const bar = this.staminaBars[i];
      if (!bar || bar.destroyed) continue;
      bar.clear();
      let color = DEPLETED_COLOR;

      if ((this.staminaBars.length - i) <= this.remainingStamina) {
        // Calculate gradient based on remaining stamina
        // 1 stamina = red, 5 stamina = green, with colors in between
        const staminaLevel = this.remainingStamina;
        if (staminaLevel === 1) {
          color = 0xFF0000; // Red
        } else if (staminaLevel === 2) {
          color = 0xFF8000; // Orange
        } else if (staminaLevel === 3) {
          color = 0xFFFF00; // Yellow
        } else if (staminaLevel === 4) {
          color = 0x80FF00; // Yellow-Green
        } else if (staminaLevel === 5) {
          color = 0x00FF00; // Green
        } else {
          color = 0x00FF00; // Default to green for higher values
        }
      }

      bar.beginFill(color);
      bar.drawRect(0, 0, BAR_WIDTH, BAR_HEIGHT);
      bar.endFill();
    }
  }

  // --- Tooltip Methods ---
  showTooltip(event) {
    const tooltipElement = document.getElementById('pawn-tooltip');
    if (!tooltipElement || !this.isActive || !this.linkedCard) {
      this.hideTooltip(); // Ensure it's hidden if conditions aren't met
      return;
    }

    // 1. Set content
    const hp = this.currentHP ?? this.linkedCard.hp ?? '?';
    const stamina = this.remainingStamina ?? this.linkedCard.stamina ?? '?';
    const attack = this.linkedCard.attack ?? '?';
    tooltipElement.innerHTML = `🛡️ ${hp} | 🐎 ${stamina} | ⚔️ ${attack}`;

    // Ensure tooltip is a direct child of body for reliable fixed positioning
    if (tooltipElement.parentElement !== document.body) {
      document.body.appendChild(tooltipElement);
    }

    // 2. Make it measurable but hidden
    tooltipElement.style.visibility = 'hidden';
    tooltipElement.style.display = 'block';

    // 3. Compute transformed pawn center in viewport coordinates
    const canvasRect = app.view.getBoundingClientRect();
    const scale = app.stage?.scale?.x || 1;
    const stageX = app.stage?.x || 0;
    const stageY = app.stage?.y || 0;
    const pawnCenterX_Viewport = canvasRect.left + stageX + this.pixiObject.x * scale;
    const pawnCenterY_Viewport = canvasRect.top + stageY + this.pixiObject.y * scale;

    // 4. Measure tooltip
    const tooltipRect = tooltipElement.getBoundingClientRect();

    // 5. Place above pawn with small offset; clamp to viewport
    const radiusPx = (CELL_SIZE * 0.4) * scale;
    const pointerHeight = 6;
    const verticalBuffer = 6;
    let tx = pawnCenterX_Viewport - tooltipRect.width / 2;
    let ty = pawnCenterY_Viewport - radiusPx - pointerHeight - verticalBuffer - tooltipRect.height;
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    tx = Math.max(8, Math.min(vw - tooltipRect.width - 8, tx));
    ty = Math.max(8, Math.min(vh - tooltipRect.height - 8, ty));

    tooltipElement.style.left = `${Math.round(tx)}px`;
    tooltipElement.style.top = `${Math.round(ty)}px`;
    tooltipElement.style.visibility = 'visible';
  }

  hideTooltip() {
    const tooltipElement = document.getElementById('pawn-tooltip');
    if (tooltipElement) {
      tooltipElement.style.display = 'none';
      tooltipElement.style.visibility = 'visible'; // Reset visibility when hiding
    }
  }
  // --- End Tooltip Methods ---
}
