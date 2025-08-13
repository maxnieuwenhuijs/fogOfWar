// Mobile Test Flow for Fog of War
(function() {
  'use strict';

  // State Management
  const state = {
    currentScreen: 'lobby-screen',
    isMenuOpen: false,
    isInfoOpen: false,
    isChatOpen: false,
    isCardPanelOpen: false,
    selectedUnit: null,
    dragStartY: 0,
    dragThreshold: 50,
    gamePhase: 'lobby',
    playerNumber: null,
    roomCode: null,
    units: {
      1: { hp: 3, speed: 2, attack: 2 },
      2: { hp: 2, speed: 3, attack: 2 },
      3: { hp: 1, speed: 1, attack: 5 }
    }
  };

  // Cache DOM Elements
  const elements = {
    screens: {},
    menuBtn: null,
    infoBtn: null,
    slideMenu: null,
    infoPanel: null,
    cardPanel: null,
    chatPanel: null,
    toastContainer: null,
    loadingOverlay: null
  };

  // Initialize on DOM Ready
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheElements();
    setupEventListeners();
    setupTouchGestures();
    initializeTestData();
    showScreen('lobby-screen');
    console.log('Mobile UI initialized');
  }

  function cacheElements() {
    // Cache all screens
    document.querySelectorAll('.screen').forEach(screen => {
      elements.screens[screen.id] = screen;
    });

    // Cache UI elements
    elements.menuBtn = document.getElementById('menu-toggle');
    elements.infoBtn = document.getElementById('info-toggle');
    elements.slideMenu = document.getElementById('slide-menu');
    elements.infoPanel = document.getElementById('info-panel');
    elements.cardPanel = document.getElementById('card-panel');
    elements.chatPanel = document.getElementById('chat-panel');
    elements.toastContainer = document.getElementById('toast-container');
    elements.loadingOverlay = document.getElementById('loading-overlay');
  }

  function setupEventListeners() {
    // Header buttons
    elements.menuBtn?.addEventListener('click', toggleMenu);
    elements.infoBtn?.addEventListener('click', toggleInfo);

    // Menu items
    document.getElementById('close-menu')?.addEventListener('click', closeMenu);
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', handleMenuAction);
    });

    // Lobby screen
    document.getElementById('create-game-mobile')?.addEventListener('click', handleCreateGame);
    document.getElementById('join-game-mobile')?.addEventListener('click', showJoinInput);
    document.getElementById('quick-play-mobile')?.addEventListener('click', handleQuickPlay);
    document.getElementById('confirm-join')?.addEventListener('click', handleJoinGame);
    document.getElementById('cancel-join')?.addEventListener('click', hideJoinInput);
    document.getElementById('refresh-games')?.addEventListener('click', refreshGamesList);

    // Waiting screen
    document.getElementById('copy-code')?.addEventListener('click', copyRoomCode);
    document.getElementById('cancel-waiting')?.addEventListener('click', cancelWaiting);

    // Game screen - Action bar
    document.getElementById('cards-btn')?.addEventListener('click', toggleCardPanel);
    document.getElementById('chat-btn')?.addEventListener('click', toggleChat);
    document.getElementById('end-turn-btn')?.addEventListener('click', endTurn);

    // Card panel
    document.getElementById('confirm-cards')?.addEventListener('click', confirmCards);
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', applyPreset);
    });

    // Unit card inputs
    document.querySelectorAll('.unit-card input').forEach(input => {
      input.addEventListener('input', updateUnitTotal);
      input.addEventListener('focus', () => input.select());
    });

    // Chat
    document.getElementById('close-chat')?.addEventListener('click', closeChat);
    document.getElementById('send-message')?.addEventListener('click', sendMessage);
    document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Victory screen
    document.getElementById('play-again')?.addEventListener('click', playAgain);
    document.getElementById('back-to-lobby')?.addEventListener('click', backToLobby);
  }

  function setupTouchGestures() {
    // Card panel swipe gesture
    const cardPanel = elements.cardPanel;
    const panelHandle = cardPanel?.querySelector('.panel-handle');
    
    if (panelHandle) {
      let startY = 0;
      let currentY = 0;
      let isDragging = false;

      const startDrag = (e) => {
        isDragging = true;
        startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        cardPanel.style.transition = 'none';
      };

      const drag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        if (state.isCardPanelOpen) {
          // Dragging down to close
          if (deltaY > 0) {
            cardPanel.style.transform = `translateY(${deltaY}px)`;
          }
        } else {
          // Dragging up to open
          if (deltaY < 0) {
            const maxDrag = window.innerHeight * 0.8;
            const dragAmount = Math.max(deltaY, -maxDrag);
            cardPanel.style.transform = `translateY(calc(100% - 60px + ${dragAmount}px))`;
          }
        }
      };

      const endDrag = (e) => {
        if (!isDragging) return;
        isDragging = false;
        cardPanel.style.transition = '';
        
        const deltaY = currentY - startY;
        const threshold = 50;
        
        if (state.isCardPanelOpen) {
          if (deltaY > threshold) {
            closeCardPanel();
          } else {
            openCardPanel();
          }
        } else {
          if (deltaY < -threshold) {
            openCardPanel();
          } else {
            closeCardPanel();
          }
        }
        
        cardPanel.style.transform = '';
      };

      // Touch events
      panelHandle.addEventListener('touchstart', startDrag, { passive: false });
      panelHandle.addEventListener('touchmove', drag, { passive: false });
      panelHandle.addEventListener('touchend', endDrag);
      
      // Mouse events for testing
      panelHandle.addEventListener('mousedown', startDrag);
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', endDrag);
    }

    // Swipe to open menu
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    });

    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].clientX;
      handleSwipe();
    });

    function handleSwipe() {
      const swipeThreshold = 75;
      const diff = touchEndX - touchStartX;
      
      // Swipe right to open menu
      if (diff > swipeThreshold && touchStartX < 50) {
        openMenu();
      }
      // Swipe left to close menu
      else if (diff < -swipeThreshold && state.isMenuOpen) {
        closeMenu();
      }
    }
  }

  // Screen Management
  function showScreen(screenId) {
    Object.values(elements.screens).forEach(screen => {
      screen.classList.remove('active');
    });
    
    const targetScreen = elements.screens[screenId];
    if (targetScreen) {
      targetScreen.classList.add('active');
      state.currentScreen = screenId;
      updatePhaseDisplay(screenId);
    }
  }

  function updatePhaseDisplay(screenId) {
    const phaseDisplay = document.getElementById('phase-display');
    if (!phaseDisplay) return;
    
    const phases = {
      'lobby-screen': 'Lobby',
      'waiting-screen': 'Waiting',
      'game-screen': state.gamePhase || 'Action'
    };
    
    phaseDisplay.textContent = phases[screenId] || 'Unknown';
  }

  // Menu Controls
  function toggleMenu() {
    state.isMenuOpen ? closeMenu() : openMenu();
  }

  function openMenu() {
    elements.slideMenu?.classList.add('open');
    state.isMenuOpen = true;
  }

  function closeMenu() {
    elements.slideMenu?.classList.remove('open');
    state.isMenuOpen = false;
  }

  function handleMenuAction(e) {
    const action = e.currentTarget.dataset.action;
    closeMenu();
    
    switch(action) {
      case 'home':
        showScreen('lobby-screen');
        break;
      case 'settings':
        showToast('Settings coming soon!');
        break;
      case 'help':
        showToast('Help section coming soon!');
        break;
      case 'quit':
        if (confirm('Are you sure you want to quit?')) {
          showScreen('lobby-screen');
        }
        break;
    }
  }

  // Info Panel
  function toggleInfo() {
    state.isInfoOpen ? closeInfo() : openInfo();
  }

  function openInfo() {
    elements.infoPanel?.classList.add('open');
    state.isInfoOpen = true;
  }

  function closeInfo() {
    elements.infoPanel?.classList.remove('open');
    state.isInfoOpen = false;
  }

  // Lobby Actions
  function handleCreateGame() {
    showLoading('Creating game...');
    
    // Simulate server response
    setTimeout(() => {
      hideLoading();
      state.roomCode = generateRoomCode();
      state.playerNumber = 1;
      document.getElementById('room-code-display').textContent = state.roomCode;
      showScreen('waiting-screen');
      showToast(`Game created! Code: ${state.roomCode}`);
      
      // Simulate opponent joining after 3 seconds
      setTimeout(() => {
        startGame();
      }, 3000);
    }, 1000);
  }

  function showJoinInput() {
    document.getElementById('join-input-section').style.display = 'block';
    document.getElementById('room-code-input').focus();
  }

  function hideJoinInput() {
    document.getElementById('join-input-section').style.display = 'none';
    document.getElementById('room-code-input').value = '';
  }

  function handleJoinGame() {
    const code = document.getElementById('room-code-input').value.toUpperCase();
    if (code.length !== 6) {
      showToast('Please enter a valid 6-letter code');
      return;
    }
    
    showLoading('Joining game...');
    
    // Simulate joining
    setTimeout(() => {
      hideLoading();
      state.roomCode = code;
      state.playerNumber = 2;
      hideJoinInput();
      startGame();
      showToast('Joined game successfully!');
    }, 1000);
  }

  function handleQuickPlay() {
    showLoading('Finding match...');
    
    setTimeout(() => {
      hideLoading();
      state.roomCode = generateRoomCode();
      state.playerNumber = Math.random() > 0.5 ? 1 : 2;
      startGame();
      showToast('Match found!');
    }, 1500);
  }

  function cancelWaiting() {
    if (confirm('Cancel and return to lobby?')) {
      showScreen('lobby-screen');
      state.roomCode = null;
      state.playerNumber = null;
    }
  }

  function refreshGamesList() {
    const refreshBtn = document.getElementById('refresh-games');
    refreshBtn.style.transform = 'rotate(360deg)';
    
    setTimeout(() => {
      refreshBtn.style.transform = '';
      showToast('Games list refreshed');
      
      // Update games list with mock data
      const gamesList = document.getElementById('games-list');
      gamesList.innerHTML = `
        <div class="game-item">
          <span class="game-code">${generateRoomCode()}</span>
          <span class="game-players">1/2 Players</span>
          <button class="join-btn">Join</button>
        </div>
        <div class="game-item">
          <span class="game-code">${generateRoomCode()}</span>
          <span class="game-players">1/2 Players</span>
          <button class="join-btn">Join</button>
        </div>
      `;
    }, 500);
  }

  // Game Actions
  function startGame() {
    showScreen('game-screen');
    state.gamePhase = 'setup';
    document.getElementById('player-display').textContent = `Player ${state.playerNumber}`;
    document.getElementById('round-display').textContent = '1';
    
    // Initialize game board (placeholder)
    initializeGameBoard();
    
    // Show card definition phase
    showCardDefinition();
    showToast('Game started! Define your units.');
  }

  function initializeGameBoard() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    
    // Initialize PIXI application
    if (typeof PIXI !== 'undefined') {
      const app = new PIXI.Application({
        view: canvas,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        backgroundColor: 0x8b7355,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
      });
      
      // Draw a simple grid for testing
      const graphics = new PIXI.Graphics();
      graphics.lineStyle(1, 0x000000, 0.3);
      
      const cellSize = Math.min(app.screen.width, app.screen.height) / 11;
      
      for (let i = 0; i <= 11; i++) {
        // Vertical lines
        graphics.moveTo(i * cellSize, 0);
        graphics.lineTo(i * cellSize, 11 * cellSize);
        
        // Horizontal lines
        graphics.moveTo(0, i * cellSize);
        graphics.lineTo(11 * cellSize, i * cellSize);
      }
      
      app.stage.addChild(graphics);
      
      // Store app reference
      window.pixiApp = app;
    }
  }

  // Card Panel
  function toggleCardPanel() {
    state.isCardPanelOpen ? closeCardPanel() : openCardPanel();
  }

  function openCardPanel() {
    elements.cardPanel?.classList.add('open');
    state.isCardPanelOpen = true;
  }

  function closeCardPanel() {
    elements.cardPanel?.classList.remove('open');
    state.isCardPanelOpen = false;
  }

  function showCardDefinition() {
    document.getElementById('card-definition').style.display = 'block';
    document.getElementById('card-linking').style.display = 'none';
    document.getElementById('action-info').style.display = 'none';
    openCardPanel();
  }

  function applyPreset(e) {
    const preset = e.currentTarget.dataset.preset;
    const presets = {
      scout: { hp: 1, speed: 5, attack: 1 },
      tank: { hp: 4, speed: 1, attack: 2 },
      assault: { hp: 3, speed: 1, attack: 3 }
    };
    
    const values = presets[preset];
    if (!values) return;
    
    // Apply to all units
    for (let i = 1; i <= 3; i++) {
      const card = document.querySelector(`.unit-card[data-unit="${i}"]`);
      if (card) {
        card.querySelector('input[data-stat="hp"]').value = values.hp;
        card.querySelector('input[data-stat="speed"]').value = values.speed;
        card.querySelector('input[data-stat="attack"]').value = values.attack;
        updateUnitTotal({ target: card.querySelector('input') });
      }
    }
    
    showToast(`Applied ${preset} preset to all units`);
  }

  function updateUnitTotal(e) {
    const card = e.target.closest('.unit-card');
    if (!card) return;
    
    const hp = parseInt(card.querySelector('input[data-stat="hp"]').value) || 0;
    const speed = parseInt(card.querySelector('input[data-stat="speed"]').value) || 0;
    const attack = parseInt(card.querySelector('input[data-stat="attack"]').value) || 0;
    
    const total = hp + speed + attack;
    const totalSpan = card.querySelector('.unit-total span');
    const totalDiv = card.querySelector('.unit-total');
    
    totalSpan.textContent = total;
    
    if (total !== 7) {
      totalDiv.classList.add('invalid');
    } else {
      totalDiv.classList.remove('invalid');
    }
    
    // Store in state
    const unitNum = card.dataset.unit;
    state.units[unitNum] = { hp, speed, attack };
  }

  function confirmCards() {
    // Validate all units
    let allValid = true;
    for (let i = 1; i <= 3; i++) {
      const unit = state.units[i];
      const total = unit.hp + unit.speed + unit.attack;
      if (total !== 7) {
        allValid = false;
        break;
      }
    }
    
    if (!allValid) {
      showToast('Each unit must have exactly 7 total points!');
      return;
    }
    
    showToast('Units confirmed!');
    closeCardPanel();
    
    // Move to next phase
    setTimeout(() => {
      showLinkingPhase();
    }, 1000);
  }

  function showLinkingPhase() {
    state.gamePhase = 'linking';
    document.getElementById('card-definition').style.display = 'none';
    document.getElementById('card-linking').style.display = 'block';
    document.getElementById('action-info').style.display = 'none';
    
    // Populate available units
    const availableUnits = document.getElementById('available-units');
    availableUnits.innerHTML = '';
    
    for (let i = 1; i <= 3; i++) {
      const unit = state.units[i];
      const unitDiv = document.createElement('div');
      unitDiv.className = 'unit-card available';
      unitDiv.dataset.unit = i;
      unitDiv.innerHTML = `
        <h4>Unit ${i}</h4>
        <div class="unit-stats">
          <span>🛡️ ${unit.hp}</span>
          <span>🐎 ${unit.speed}</span>
          <span>⚔️ ${unit.attack}</span>
        </div>
      `;
      unitDiv.addEventListener('click', selectUnitForLinking);
      availableUnits.appendChild(unitDiv);
    }
    
    openCardPanel();
    showToast('Select units and assign to regiments on the board');
  }

  function selectUnitForLinking(e) {
    // Remove previous selection
    document.querySelectorAll('.unit-card.selected').forEach(card => {
      card.classList.remove('selected');
    });
    
    // Select this unit
    e.currentTarget.classList.add('selected');
    state.selectedUnit = e.currentTarget.dataset.unit;
    showToast(`Unit ${state.selectedUnit} selected. Tap a regiment on the board.`);
  }

  // Chat
  function toggleChat() {
    state.isChatOpen ? closeChat() : openChat();
  }

  function openChat() {
    elements.chatPanel?.classList.add('open');
    state.isChatOpen = true;
    
    // Clear notification badge
    const badge = document.querySelector('#chat-btn .notification-badge');
    if (badge) badge.style.display = 'none';
  }

  function closeChat() {
    elements.chatPanel?.classList.remove('open');
    state.isChatOpen = false;
  }

  function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    addChatMessage(message, true);
    input.value = '';
    
    // Simulate opponent response
    setTimeout(() => {
      addChatMessage('Good luck!', false);
    }, 2000);
  }

  function addChatMessage(text, isOwn) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isOwn ? 'own' : 'opponent'}`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Show notification if chat is closed and message is from opponent
    if (!state.isChatOpen && !isOwn) {
      const badge = document.querySelector('#chat-btn .notification-badge');
      if (badge) {
        badge.style.display = 'block';
        badge.textContent = '1';
      }
      showToast('New message received');
    }
  }

  function endTurn() {
    showToast('Turn ended');
    document.getElementById('end-turn-btn').disabled = true;
    
    // Simulate opponent's turn
    setTimeout(() => {
      showToast("Opponent's turn");
      setTimeout(() => {
        showToast('Your turn!');
        document.getElementById('end-turn-btn').disabled = false;
      }, 2000);
    }, 1000);
  }

  // Victory
  function showVictory(winner) {
    document.getElementById('winner-name').textContent = winner;
    document.getElementById('victory-overlay').style.display = 'flex';
  }

  function playAgain() {
    document.getElementById('victory-overlay').style.display = 'none';
    startGame();
  }

  function backToLobby() {
    document.getElementById('victory-overlay').style.display = 'none';
    showScreen('lobby-screen');
    state.roomCode = null;
    state.playerNumber = null;
    state.gamePhase = 'lobby';
  }

  // Utilities
  function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  function copyRoomCode() {
    const code = document.getElementById('room-code-display').textContent;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        showToast('Room code copied!');
      }).catch(() => {
        fallbackCopy(code);
      });
    } else {
      fallbackCopy(code);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      showToast('Room code copied!');
    } catch (err) {
      showToast('Failed to copy code');
    }
    
    document.body.removeChild(textarea);
  }

  function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, duration);
  }

  function showLoading(message = 'Loading...') {
    const overlay = elements.loadingOverlay;
    if (overlay) {
      overlay.querySelector('p').textContent = message;
      overlay.style.display = 'flex';
    }
  }

  function hideLoading() {
    if (elements.loadingOverlay) {
      elements.loadingOverlay.style.display = 'none';
    }
  }

  function initializeTestData() {
    // Add test data for quick testing
    window.mobileTest = {
      showVictory: () => showVictory('1'),
      startGame: startGame,
      showToast: showToast,
      toggleCardPanel: toggleCardPanel,
      toggleChat: toggleChat,
      addMessage: (msg) => addChatMessage(msg, false),
      state: state
    };
    
    console.log('Test functions available via window.mobileTest');
  }

  // Handle resize
  window.addEventListener('resize', () => {
    if (window.pixiApp) {
      const canvas = document.getElementById('game-canvas');
      window.pixiApp.renderer.resize(canvas.clientWidth, canvas.clientHeight);
    }
  });

  // Prevent zoom on double tap
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

})();