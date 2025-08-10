// --- START OF FILE public/js/sound-manager.js ---

console.log("🔊 Sound Manager loading...");

const soundManager = {
  // Definieer hier je geluiden per categorie
  soundLibrary: {
    // Movement sounds
    pawn_move: ["assets/sounds/pawn_move/move.mp3"],

    // Combat related sounds
    elimination: ["assets/sounds/elimination/elimination1.wav"],
    // Generic attack swing/impact — reuse an existing suitable sound if no dedicated file
    attack: ["assets/sounds/ui_click/drum4.mp3"],

    // UI related sounds
    ui_click: [
      "assets/sounds/ui_click/drum1.mp3",
      "assets/sounds/ui_click/drum2.mp3",
      "assets/sounds/ui_click/drum3.mp3",
      "assets/sounds/ui_click/drum4.mp3",
      "assets/sounds/ui_click/drum5.mp3",
    ],
    ui_hover: ["assets/sounds/ui_hover/hover.wav"],
    ui_deselect: ["assets/sounds/ui_deselect/deselect1.wav"],
    ui_bleed: ["assets/sounds/ui_bleed/bleed.mp3"],
    ui_chat: ["assets/sounds/ui_chat/notification.mp3"],
    ui_confirm_cards: ["assets/sounds/ui_confirm_cards/confirm.mp3"],
    ui_link: ["assets/sounds/ui_link/pawn_link.mp3"],
    ui_action_phase: ["assets/sounds/ui_action_phase/action_start.mp3"],
    pawn_in_haven: ["assets/sounds/pawn_in_haven/trumpet.mp3"],
    ui_winner: ["assets/sounds/ui_winner/winner.mp3"],
    ui_setup: ["assets/sounds/ui_setup/rally_call.mp3"], // Added setup sound
    ui_start: ["assets/sounds/ui_start/start.mp3"], // Added start game sound

    // RPS sounds
    rps_rock: ["assets/sounds/ui_rps/rock.mp3"],
    rps_paper: ["assets/sounds/ui_rps/paper.mp3"],
    rps_scissors: ["assets/sounds/ui_rps/scissors.mp3"],
    rps_win: ["assets/sounds/ui_rps/win.mp3"],
    rps_lose: ["assets/sounds/ui_rps/lose.mp3"],
    rps_tie: ["assets/sounds/ui_rps/tie.mp3"],
  },

  loadedSounds: {}, // Hier slaan we de geladen Audio objecten op
  categoryVolumes: {
    // NEW: Store volume multipliers per category
    ui_hover: 0.1, // Set hover sound quieter by default (30% volume)
  },
  globalVolume: 0.2, // Default global volume set to 50% - increased for better audibility
  isMuted: false,
  isLoading: false,
  soundsToLoad: 0,
  soundsLoaded: 0,
  autoplayHandlerAdded: false,

  // --- Background Music Properties ---
  backgroundMusicTracks: [
    "assets/music/Strauss Annen Polka.mp3",
    "assets/music/Strauss Emperor Waltz.mp3",
    "assets/music/Strauss Pizzicato Polka.mp3",
    "assets/music/Strauss Tales From The Vienna Woods.mp3",
    "assets/music/Strauss The Blue Danube.mp3",
    "assets/music/Strauss The Radetzky March.mp3",
    "assets/music/Strauss Vienna Blood Waltz.mp3",
    "assets/music/Strauss Voices of Spring Waltz.mp3",
    "assets/music/Strauss Waltz Tales from The Vienna Woods.mp3"
  ],
  currentMusic: null, // Stores the Howl object for the current music
  isMusicPlaying: false,
  musicVolume: 0.02, // Default low volume for music (e.g., 5%)
  // --- End Background Music Properties ---

  preloadSounds(callback) {
    console.log("🔊 Preloading sounds...");
    this.isLoading = true;
    this.soundsLoaded = 0;
    this.soundsToLoad = 0;

    // Tel het totaal aantal te laden geluiden
    for (const category in this.soundLibrary) {
      this.soundsToLoad += this.soundLibrary[category].length;
    }
    console.log(`🔊 Total sounds to load: ${this.soundsToLoad}`);

    if (this.soundsToLoad === 0) {
      console.log("🔊 No sounds defined in library.");
      this.isLoading = false;
      if (callback) callback();
      return;
    }

    for (const category in this.soundLibrary) {
      this.loadedSounds[category] = []; // Initialiseer array voor deze categorie

      this.soundLibrary[category].forEach((filePath) => {
        const audio = new Audio(filePath);

        // Event listeners om te weten wanneer het laden klaar of mislukt is
        const onSoundLoadOrError = () => {
          this.soundsLoaded++;
          // Verwijder listeners om memory leaks te voorkomen
          audio.removeEventListener("canplaythrough", onSoundLoadOrError);
          audio.removeEventListener("error", onSoundLoadOrError);
          console.log(
            `🔊 Sound loaded/error (${this.soundsLoaded}/${this.soundsToLoad}): ${filePath}`
          );

          // Check of alles geladen is
          if (this.soundsLoaded >= this.soundsToLoad) {
            this.isLoading = false;
            console.log("🔊 All sounds preloaded (or failed loading).");
            if (callback) callback(); // Roep de callback aan als alles klaar is
          }
        };

        audio.addEventListener("canplaythrough", onSoundLoadOrError, {
          once: true,
        });
        audio.addEventListener(
          "error",
          (e) => {
            console.error(`🔊 Error loading sound: ${filePath}`, e);
            onSoundLoadOrError(); // Tel het toch mee als 'klaar' om niet vast te lopen
          },
          { once: true }
        );

        // Voeg toe aan de geladen lijst (ook al is het nog niet klaar met laden)
        this.loadedSounds[category].push(audio);
        // Start het laden (sommige browsers vereisen dit)
        audio.load();
      });
    }
  },

  playSound(category) {
    console.log(`🔊 Attempting to play sound category: ${category}`);

    if (this.isMuted || this.isLoading) {
      console.log(`🔊 Cannot play sound - muted: ${this.isMuted}, loading: ${this.isLoading}`);
      return;
    }

    const soundsInCategory = this.loadedSounds[category];
    if (!soundsInCategory || soundsInCategory.length === 0) {
      console.warn(`🔊 Sound category "${category}" not found or empty.`);
      return;
    }

    const randomIndex = Math.floor(Math.random() * soundsInCategory.length);
    const soundToPlay = soundsInCategory[randomIndex];

    if (soundToPlay) {
      const categoryVolume = this.categoryVolumes[category] ?? 1.0;
      const finalVolume = this.globalVolume * categoryVolume;
      console.log(`🔊 Playing sound "${category}" with volume ${finalVolume} (global: ${this.globalVolume}, category: ${categoryVolume})`);

      soundToPlay.volume = finalVolume; // Set volume before playing
      soundToPlay.currentTime = 0;

      const playPromise = soundToPlay.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`🔊 Sound "${category}" playback started successfully`);
        }).catch((error) => {
          console.warn(`🔊 Error playing sound (${category}):`, error.message);
        });
      }
    } else {
      console.warn(
        `🔊 Sound object not found at index ${randomIndex} for category ${category}.`
      );
    }
  },

  // --- Background Music Methods ---
  playNextTrack() {
    if (this.isMuted || this.backgroundMusicTracks.length === 0) {
      this.isMusicPlaying = false;
      this.currentMusic = null;
      return; // Don't play if muted or no tracks
    }

    // Stop previous track if any
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.removeEventListener('ended', this.currentMusic.onEndCallback);
      this.currentMusic = null;
    }

    // Select random track
    const randomIndex = Math.floor(Math.random() * this.backgroundMusicTracks.length);
    const trackPath = this.backgroundMusicTracks[randomIndex];
    console.log(`🔊 Starting background music track: ${trackPath}`);

    // Use standard Audio API instead of Howler
    const audio = new Audio(trackPath);
    audio.volume = this.musicVolume * this.globalVolume;

    // Set up ended callback to play next track
    audio.onEndCallback = () => {
      console.log(`🔊 Music track finished: ${trackPath}. Playing next.`);
      setTimeout(() => this.playNextTrack(), 100);
    };
    audio.addEventListener('ended', audio.onEndCallback);

    // Handle errors
    audio.addEventListener('error', (e) => {
      console.error(`🔊 Error playing music track ${trackPath}:`, e);
      this.isMusicPlaying = false;
      this.currentMusic = null;
      // Try next track after a delay
      setTimeout(() => this.playNextTrack(), 1000);
    });

    // Start playing
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn(`🔊 Autoplay prevented for music: ${error.message}`);
        this.isMusicPlaying = false;
        this.currentMusic = null;
      });
    }

    this.currentMusic = audio;
    this.isMusicPlaying = true;
  },

  playBackgroundMusic() {
    if (this.isMusicPlaying || this.backgroundMusicTracks.length === 0) {
      console.log(`🔊 Background music already playing or no tracks available.`);
      return;
    }
    console.log("🔊 Initiating background music playback...");

    // Try to play music
    this.playNextTrack(); // Start the first track

    // If music doesn't start due to browser autoplay restrictions,
    // add a one-time event listener for user interaction to start playback
    if (!this.autoplayHandlerAdded && typeof document !== 'undefined') {
      this.autoplayHandlerAdded = true;
      console.log("🔊 Adding document-wide interaction handler for music autoplay");

      const startMusicOnInteraction = () => {
        console.log("🔊 User interaction detected - attempting to start music again");
        if (!this.isMusicPlaying) {
          this.playNextTrack();
        }
        // Remove the listener after first interaction
        document.removeEventListener('click', startMusicOnInteraction);
        document.removeEventListener('keydown', startMusicOnInteraction);
        document.removeEventListener('touchstart', startMusicOnInteraction);
      };

      document.addEventListener('click', startMusicOnInteraction);
      document.addEventListener('keydown', startMusicOnInteraction);
      document.addEventListener('touchstart', startMusicOnInteraction);
    }
  },

  stopBackgroundMusic() {
    if (this.currentMusic) {
      console.log("🔊 Stopping background music.");
      this.currentMusic.pause();
      if (this.currentMusic.onEndCallback) {
        this.currentMusic.removeEventListener('ended', this.currentMusic.onEndCallback);
      }
      this.currentMusic = null;
    }
    this.isMusicPlaying = false;
  },
  // --- End Background Music Methods ---

  toggleMute() {
    this.isMuted = !this.isMuted;
    console.log(`🔊 Sounds ${this.isMuted ? "Muted" : "Unmuted"}`);

    // Mute/Unmute background music
    if (this.isMuted) {
      if (this.isMusicPlaying && this.currentMusic) {
        this.currentMusic.pause(); // Pause instead of stop to resume later
        console.log("🔊 Background music paused due to mute.");
      }
    } else {
      if (this.currentMusic && !this.isMusicPlaying) {
        // If music was paused due to mute, resume it
        try {
          const playPromise = this.currentMusic.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn("🔊 Could not resume music:", error);
              this.currentMusic = null;
              // Try to start fresh
              this.playBackgroundMusic();
            });
          }
          this.isMusicPlaying = true; // Ensure flag is set
          console.log("🔊 Background music resumed after unmute.");
        } catch (e) {
          console.warn("🔊 Error resuming music:", e);
          this.currentMusic = null;
          this.playBackgroundMusic();
        }
      } else if (!this.isMusicPlaying && this.backgroundMusicTracks.length > 0) {
        // If music wasn't playing at all, start it
        this.playBackgroundMusic();
      }
    }

    // Update the mute button text/style
    const muteButton = document.getElementById("mute-btn");
    if (muteButton) {
      muteButton.textContent = this.isMuted ? "Unmute Sounds" : "Mute Sounds";
      muteButton.style.backgroundColor = this.isMuted ? "#aaa" : "#4a6ea9";
    }
  },

  // Set global volume (affects all sounds AND music)
  setVolume(volume) {
    const newGlobalVolume = Math.max(0, Math.min(1, volume));
    if (this.globalVolume === newGlobalVolume) return;

    this.globalVolume = newGlobalVolume;
    console.log(`🔊 Setting GLOBAL volume to: ${this.globalVolume}`);

    // Update volume on all loaded SFX
    for (const category in this.loadedSounds) {
      const categoryVolume = this.categoryVolumes[category] ?? 1.0;
      const finalVolume = this.globalVolume * categoryVolume;
      this.loadedSounds[category].forEach(audio => {
        if (audio) {
          audio.volume = finalVolume;
        }
      });
    }
    console.log(`🔊 Updated volume for all preloaded SFX.`);

    // Update Background Music Volume
    if (this.currentMusic && this.isMusicPlaying) {
      this.currentMusic.volume = this.musicVolume * this.globalVolume;
      console.log(`🔊 Updated background music volume.`);
    }
  },

  // Set volume for a specific category (and update loaded sounds) - Does NOT affect music
  setCategoryVolume(category, volume) {
    if (typeof this.soundLibrary[category] === "undefined") {
      console.warn(`🔊 Cannot set volume for unknown category: ${category}`);
      return;
    }
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (this.categoryVolumes[category] === clampedVolume) return;

    this.categoryVolumes[category] = clampedVolume;
    console.log(
      `🔊 Setting volume for category "${category}" to: ${clampedVolume}`
    );

    // Update volume on sounds in this category immediately
    const finalVolume = this.globalVolume * clampedVolume;
    if (this.loadedSounds[category]) {
      this.loadedSounds[category].forEach(audio => {
        if (audio) {
          audio.volume = finalVolume;
        }
      });
      console.log(`🔊 Updated volume for sounds in category ${category} to final volume ${finalVolume}`);
    }
  },
};

console.log("🔊 Sound Manager loaded.");
// --- END OF FILE public/js/sound-manager.js ---
