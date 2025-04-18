/**
 * Side Player class for the NovaReader extension
 */

// SVG Icons
import { ICONS } from '../utils';
// Import CSS to help Vite track dependencies
import '../../../css/player.css';
// Import audio player for streaming
import { AudioStreamPlayer } from '../audioPlayer';
// Import voice styler
import voiceStyler from '../voiceStyler';
// Import logger
import { createLogger } from '../../utils/logger';

// Create a logger instance for this module
const logger = createLogger('SidePlayer');

// Import utility functions
import { 
  createButton, 
  addClickEffect, 
  dispatchSelectionButtonStateEvent,
  getSelectedVoice
} from './utils/playerEvents';

// Import handlers
import {
  handlePlaybackStart,
  handlePlaybackEnd,
  handlePlaybackPause,
  handlePlaybackError,
  updateTimeDisplay
} from './handlers/playbackHandlers';

// Import the text highlighters
import { TextHighlighter } from './handlers/textHighlighter';
import { InlineTextHighlighter } from './handlers/inlineTextHighlighter';

// Import types from speechify API
import { 
  synthesizeWithSpeechMarks, 
  streamTextToSpeech, 
  SSMLStyleOptions,
  NestedChunk 
} from '../speechifyApi';

export class SidePlayer {
  // Make these public for the event handlers to access
  public playerId: string = 'extension-side-player';
  public currentText: string = '';
  
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private playerElement: HTMLElement | null = null;
  private playButton: HTMLElement | null = null;
  private highlightButton: HTMLElement | null = null;
  private selectVoiceButton: HTMLElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  private isCompactMode: boolean = false; // Track compact mode state
  
  // Audio streaming player
  private audioPlayer: AudioStreamPlayer;
  
  // Text highlighting functionality
  private textHighlighter: InlineTextHighlighter;
  private highlightingEnabled: boolean = true; // Default to enabled
  
  // SSML styling - can be modified through settings
  private ssmlStyle: SSMLStyleOptions | null = null;
  
  // Default voice settings - use proper Speechify voice ID
  private defaultVoiceId: string = 'en-US-Neural2-F'; // Speechify female voice
  private defaultModelId: string = 'simba-english'; // Speechify model

  private currentSpeed: number = 1.0; // Add this property to track current speed
  private speedButton: HTMLElement | null = null; // Add this property to store speed button reference

  constructor() {
    // Initialize the audio player
    this.audioPlayer = new AudioStreamPlayer();
    
    // Initialize the inline text highlighter
    this.textHighlighter = new InlineTextHighlighter(this.audioPlayer);
    
    // Set up callbacks for audio player events
    this.audioPlayer.setCallbacks({
      onPlaybackStart: () => this.handlePlaybackStart(),
      onPlaybackEnd: () => this.handlePlaybackEnd(),
      onPlaybackPause: () => this.handlePlaybackPause(),
      onPlaybackError: (error) => this.handlePlaybackError(error),
      onTimeUpdate: (currentTime, duration) => this.updateTimeDisplay(currentTime, duration)
    });
    
    // Set up listener to ensure player is visible before playback
    this.setupEnsurePlayerVisibleListener();
    
    // Set up voice style change listener
    this.setupVoiceStyleListener();
    
    // Set up observer to detect when voice selector is closed
    this.setupVoiceSelectorObserver();
    
    // Import compact mode CSS
    this.importCompactModeCSS();
    
    // Load saved playback speed
    this.loadPlaybackSpeed();
    
    logger.info('Initialized and ready');
  }
  
  /**
   * Import the compact mode CSS
   */
  private importCompactModeCSS(): void {
    // Check if the CSS is already loaded
    if (!document.getElementById('compact-mode-css')) {
      const link = document.createElement('link');
      link.id = 'compact-mode-css';
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = chrome.runtime.getURL('css/player-compact.css');
      document.head.appendChild(link);
      logger.info('Compact mode CSS loaded');
    }
  }
  
  /**
   * Set up observer to detect when voice selector is closed
   */
  private setupVoiceSelectorObserver(): void {
    // Create a MutationObserver to watch for when the voice selector is removed from the DOM
    const observer = new MutationObserver((mutations) => {
      // Check if the voice selector exists
      const voiceSelector = document.getElementById('extension-voice-selector');
      
      // If the voice selector doesn't exist and the button has the active class, remove it
      if (!voiceSelector && this.selectVoiceButton && this.selectVoiceButton.classList.contains('active')) {
        logger.info('Voice selector closed, removing active class from button');
        this.selectVoiceButton.classList.remove('active');
      }
    });
    
    // Start observing the document body for changes to its children
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  /**
   * Set up voice style change listener
   */
  private setupVoiceStyleListener(): void {
    // Listen for voice style changes from the VoiceStyler component
    document.addEventListener('voice-style-change', (event: any) => {
      const { emotion, cadence } = event.detail;
      
      // Create SSML style object based on selected options
      let newStyle: SSMLStyleOptions | null = null;
      
      if (emotion || cadence) {
        newStyle = {};
        if (emotion) newStyle.emotion = emotion;
        if (cadence) newStyle.cadence = cadence;
      }
      
      // Update the SSML style
      this.setSSMLStyle(newStyle);
      
      logger.info(`Voice style updated from styler: ${JSON.stringify({ emotion, cadence })}`);
    });
  }
  
  /**
   * Set SSML style options
   */
  public setSSMLStyle(style: SSMLStyleOptions | null): void {
    this.ssmlStyle = style;
    logger.info(`SSML style updated: ${JSON.stringify(style)}`);
  }
  
  /**
   * Toggle text highlighting
   */
  public toggleHighlighting(): void {
    this.highlightingEnabled = !this.highlightingEnabled;
    
    // Update the highlight button's active class based on the new state
    if (this.highlightButton) {
      if (this.highlightingEnabled) {
        this.highlightButton.classList.add('active');
      } else {
        this.highlightButton.classList.remove('active');
      }
    }
    
    if (this.highlightingEnabled && this.currentText) {
      // Initialize the highlighter with the current text
      this.textHighlighter.initialize(this.currentText);
      
      // If we're playing, start highlighting
      if (this.isPlaying) {
        this.textHighlighter.startHighlighting();
      }
    } else {
      // Stop highlighting and clean up
      this.textHighlighter.stopHighlighting();
      
      if (!this.highlightingEnabled) {
        this.textHighlighter.cleanup();
      }
    }
    
    logger.info(`Text highlighting toggled: ${this.highlightingEnabled}`);
  }
  
  /**
   * Setup text highlighting with speech marks
   */
  public setupHighlighting(text: string, speechMarks: NestedChunk): void {
    if (!this.highlightingEnabled) return;
    
    // Initialize the highlighter with text
    this.textHighlighter.initialize(text);
    
    // Process any SSML in the text if needed
    if (text.includes('<') || text.includes('&')) {
      this.textHighlighter.processSsmlText(text);
    }
    
    // Set the speech marks and start highlighting
    this.textHighlighter.setSpeechMarks(speechMarks);
    
    // Start highlighting if currently playing
    if (this.isPlaying) {
      this.textHighlighter.startHighlighting();
    }
    
    logger.info('Text highlighting setup completed');
  }
  
  // Method to ensure player is visible before playback
  private setupEnsurePlayerVisibleListener(): void {
    document.addEventListener('ensure-player-visible', (event: any) => {
      const { text } = event.detail;
      logger.info('Ensuring visibility');
      
      // If player isn't visible, create it
      if (!document.getElementById(this.playerId)) {
        this.create();
        logger.info('Created new player instance');
      }
      
      // Store the text so it can be played
      if (text) {
        this.currentText = text;
        logger.info(`Text stored: ${text.length > 20 ? `${text.substring(0, 20)}...` : text}`);
      }
    });
  }
  
  // Audio player event handlers
  private handlePlaybackStart(): void {
    this.isPlaying = true;
    handlePlaybackStart(this.playButton);
    
    // Start text highlighting if enabled
    if (this.highlightingEnabled) {
      this.textHighlighter.startHighlighting();
    }
  }
  
  private handlePlaybackEnd(): void {
    this.isPlaying = false;
    this.isPaused = false;
    handlePlaybackEnd(this.playButton);
    
    // Stop text highlighting
    if (this.highlightingEnabled) {
      this.textHighlighter.stopHighlighting();
    }
  }
  
  // Method for pause events
  private handlePlaybackPause(): void {
    this.isPlaying = false;
    this.isPaused = true;
    handlePlaybackPause(this.playButton);
    
    // Pause text highlighting
    if (this.highlightingEnabled) {
      this.textHighlighter.stopHighlighting();
    }
  }
  
  private handlePlaybackError(error: string): void {
    handlePlaybackError(error, this.playButton);
  }
  
  private updateTimeDisplay(currentTime: number, duration: number): void {
    // Update the time display in the player UI
    updateTimeDisplay(this.timeDisplay, currentTime, duration);
  }

  /**
   * Toggle compact mode
   */
  public toggleCompactMode(): void {
    this.isCompactMode = !this.isCompactMode;
    
    const player = document.getElementById(this.playerId);
    if (player) {
      if (this.isCompactMode) {
        player.classList.add('compact-mode');
      } else {
        player.classList.remove('compact-mode');
      }
    }
    
    // Save the compact mode state to storage
    chrome.storage.local.set({ playerCompactMode: this.isCompactMode }, () => {
      logger.info(`Compact mode ${this.isCompactMode ? 'enabled' : 'disabled'}`);
    });
  }
  
  /**
   * Set compact mode state
   */
  public setCompactMode(enabled: boolean): void {
    if (this.isCompactMode !== enabled) {
      this.isCompactMode = enabled;
      
      const player = document.getElementById(this.playerId);
      if (player) {
        if (this.isCompactMode) {
          player.classList.add('compact-mode');
        } else {
          player.classList.remove('compact-mode');
        }
      }
      
      // Save the compact mode state to storage
      chrome.storage.local.set({ playerCompactMode: this.isCompactMode }, () => {
        logger.info(`Compact mode ${this.isCompactMode ? 'enabled' : 'disabled'}`);
      });
    }
  }
  
  /**
   * Load compact mode state from storage
   */
  private loadCompactModeState(): void {
    chrome.storage.local.get(['playerCompactMode'], (result) => {
      if (result.playerCompactMode !== undefined) {
        this.isCompactMode = result.playerCompactMode;
        logger.info(`Loaded compact mode state: ${this.isCompactMode}`);
        
        // Apply the state to the player if it exists
        const player = document.getElementById(this.playerId);
        if (player) {
          if (this.isCompactMode) {
            player.classList.add('compact-mode');
          } else {
            player.classList.remove('compact-mode');
          }
        }
      }
    });
  }

  public create(nextToPanel: boolean = false): void {
    // Check if player already exists
    if (document.getElementById(this.playerId)) {
      return;
    }

    // Create player container
    const player = document.createElement('div');
    player.id = this.playerId;
    
    // Set position based on whether panel is open
    if (nextToPanel) {
      player.classList.add('next-to-panel');
    }
    
    // Apply compact mode if enabled
    if (this.isCompactMode) {
      player.classList.add('compact-mode');
    }
    
    // Load compact mode state from storage
    this.loadCompactModeState();
    
    // Add time display
    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'time-display';
    timeDisplay.textContent = '0:00';
    this.timeDisplay = timeDisplay;
    
    // Play button
    const playButton = createButton(ICONS.play, 'Play/Pause', () => {
      logger.info(`Play button clicked, isPlaying: ${this.isPlaying}, isPaused: ${this.isPaused}`);
      
      if (this.isPlaying) {
        // If currently playing, pause instead of stop
        logger.info('Currently playing, will pause');
        this.pausePlayback();
        
        // Notify the selection button about the pause
        dispatchSelectionButtonStateEvent('play');
        
        // Also dispatch a pause event that the selection button can pick up
        const event = new CustomEvent('selection-playback', {
          detail: {
            action: 'pause',
            text: this.currentText
          }
        });
        document.dispatchEvent(event);
      } else if (this.isPaused && this.currentText) {
        // If paused with text, resume
        logger.info('Currently paused with text, will resume');
        this.resumePlayback();
      } else if (this.currentText) {
        // If not playing or paused but have text, start playing
        logger.info('Not playing but have text, will start');
        this.startPlayback(this.currentText);
      } else {
        // Try to get selected text if no current text
        const selectedText = window.getSelection()?.toString().trim();
        if (selectedText) {
          logger.info('No stored text, using selection');
          this.startPlayback(selectedText);
        } else {
          logger.info('No text selected or stored');
        }
      }
    });
    this.playButton = playButton;
    
    // Add speed button
    const speedButton = document.createElement('div');
    speedButton.className = 'speed-button';
    speedButton.textContent = '1.0x';
    speedButton.title = 'Playback Speed';
    speedButton.addEventListener('click', () => {
      // Cycle through speeds: 1.0 -> 1.5 -> 2.0 -> 0.5 -> 0.75 -> back to 1.0
      const speeds = [1.0, 1.5, 2.0, 0.5, 0.75];
      const currentIndex = speeds.indexOf(this.currentSpeed);
      const nextIndex = (currentIndex + 1) % speeds.length;
      const newSpeed = speeds[nextIndex];
      
      // Update speed
      this.setPlaybackSpeed(newSpeed);
      
      // Update button text
      speedButton.textContent = `${newSpeed}x`;
      
      // Add visual feedback
      addClickEffect(speedButton);
    });
    this.speedButton = speedButton;
    
    // Highlighting button
    const highlightButton = createButton(ICONS.highlight || '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4h10a1 1 0 0 1 0 2H11a1 1 0 1 1 0-2zm0 7h10a1 1 0 0 1 0 2H11a1 1 0 1 1 0-2zm0 7h10a1 1 0 0 1 0 2H11a1 1 0 1 1 0-2zM3 4h2v16H3V4z"></path></svg>', 'Toggle Highlighting', () => {
      logger.info('Highlight button clicked');
      this.toggleHighlighting();
      addClickEffect(highlightButton);
    });
    
    // Set initial highlight button state based on this.highlightingEnabled
    if (this.highlightingEnabled) {
      highlightButton.classList.add('active');
    }
    
    // Store reference to highlight button
    this.highlightButton = highlightButton;
    
    // Style button
    const styleButton = createButton('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>', 'Voice Style', () => {
      logger.info('Style button clicked, toggling voice styler');
      
      // Toggle the voice styler component
      const event = new CustomEvent('toggle-voice-styler');
      document.dispatchEvent(event);
      
      // Add visual feedback
      addClickEffect(styleButton);
    });
    
    // Voice selection button
    const selectVoiceButton = createButton(ICONS.microphone, 'Select Voice', () => {
      logger.info('Select Voice clicked');
      
      // Check if voice selector is already open
      const isVoiceSelectorOpen = !!document.getElementById('extension-voice-selector');
      
      // Toggle the icon based on the voice selector state
      if (isVoiceSelectorOpen) {
        // Voice selector is open and will be closed, change back to microphone
        setTimeout(() => {
          selectVoiceButton.innerHTML = ICONS.microphone;
          selectVoiceButton.setAttribute('data-state', 'closed');
          selectVoiceButton.classList.remove('active'); // Remove active class when closed
        }, 150);
      } else {
        // Voice selector is closed and will be opened, change to X
        selectVoiceButton.innerHTML = ICONS.close;
        selectVoiceButton.setAttribute('data-state', 'open');
        selectVoiceButton.classList.add('active'); // Add active class when opened
      }
      
      // Add animation class
      selectVoiceButton.classList.add('voice-button-transition');
      
      // Remove animation class after animation completes
      setTimeout(() => {
        selectVoiceButton.classList.remove('voice-button-transition');
      }, 300);
      
      // Dispatch event to toggle voice selector
      const event = new CustomEvent('toggle-voice-selector');
      document.dispatchEvent(event);
      
      // Add visual feedback
      addClickEffect(selectVoiceButton);
    });
    
    // Set initial state attribute
    selectVoiceButton.setAttribute('data-state', 'closed');
    
    // Store reference to voice selector button
    this.selectVoiceButton = selectVoiceButton;
    
    // Settings button that toggles between settings icon and X
    const settingsButton = createButton(ICONS.settings, 'Settings', () => {
      // Check if panel is already open by its existence in the DOM
      const isPanelOpen = !!document.getElementById('extension-side-panel');
      
      // Toggle the button icon between settings and X based on current state
      if (isPanelOpen) {
        // Panel is open and will be closed, revert to settings icon
        setTimeout(() => {
          settingsButton.innerHTML = ICONS.settings;
          settingsButton.setAttribute('data-state', 'closed');
        }, 150);
      } else {
        // Panel is closed and will be opened, change to X icon
        settingsButton.innerHTML = ICONS.close;
        settingsButton.setAttribute('data-state', 'open');
      }
      
      // Add animation class
      settingsButton.classList.add('settings-button-transition');
      
      // Remove animation class after animation completes
      setTimeout(() => {
        settingsButton.classList.remove('settings-button-transition');
      }, 300);
      
      // This will be handled by the panel module
      const event = new CustomEvent('toggle-panel');
      document.dispatchEvent(event);
      
      // Add visual feedback
      addClickEffect(settingsButton);
    });
    
    // Add settings button class for the red dot indicator
    settingsButton.classList.add('settings-button');
    
    // Set initial state attribute
    settingsButton.setAttribute('data-state', 'closed');
    
    // Divider
    const divider1 = document.createElement('div');
    divider1.className = 'player-divider';
    
    // Compact mode toggle button
    const compactButton = createButton('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>', 'Toggle Compact Mode', () => {
      this.toggleCompactMode();
      // Add visual feedback
      addClickEffect(compactButton);
    });
    
    // Set initial compact button state based on this.isCompactMode
    if (this.isCompactMode) {
      compactButton.classList.add('active');
    }
    
    // Close button
    const closeButton = createButton(ICONS.close, 'Close', () => {
      this.remove();
      // Add visual feedback
      addClickEffect(closeButton);
    });
    closeButton.classList.add('close-button');
    
    // Create a divider for after the play button
    const dividerAfterPlay = document.createElement('div');
    dividerAfterPlay.className = 'player-divider';
    
    // Append all elements to player in the order shown in the screenshot
    player.appendChild(timeDisplay);
    player.appendChild(playButton);
    player.appendChild(speedButton); // Add speed button after play button
    player.appendChild(dividerAfterPlay);
    player.appendChild(highlightButton);
    player.appendChild(styleButton); // Add new style button
    player.appendChild(selectVoiceButton);
    player.appendChild(settingsButton);
    player.appendChild(divider1);
    player.appendChild(compactButton); // Add compact mode button
    player.appendChild(closeButton);
    
    // Add player to page
    document.body.appendChild(player);
    this.playerElement = player;
  }


  public toggle(isPanelOpen: boolean = false): void {
    if (document.getElementById(this.playerId)) {
      this.remove();
    } else {
      this.create(isPanelOpen);
    }
  }

  public remove(): void {
    const player = document.getElementById(this.playerId);
    if (player) {
      player.remove();
      this.playerElement = null;
    }
    
    // Hide voice styler if open
    const voiceStylerElement = document.getElementById('extension-voice-styler');
    if (voiceStylerElement) {
      voiceStyler.hide();
    }
    
    // Ensure the voice selector button's active class is removed
    if (this.selectVoiceButton && this.selectVoiceButton.classList.contains('active')) {
      this.selectVoiceButton.classList.remove('active');
    }
  }
  
  public setPositionNextToPanel(nextToPanel: boolean): void {
    const player = document.getElementById(this.playerId);
    if (player) {
      if (nextToPanel) {
        player.classList.add('next-to-panel');
      } else {
        player.classList.remove('next-to-panel');
      }
    }
  }
  
  /**
   * Method to handle text playback with enhanced SSML and speech marks
   */
  public async startPlayback(text: string): Promise<void> {
    if (!text.trim()) {
      logger.warn('No text provided for playback');
      return;
    }
    
    // Stop any existing playback first
    if (this.isPlaying || this.isPaused) {
      logger.info('Stopping previous playback before starting new one');
      this.stopPlayback();
    }
    
    this.currentText = text;
    
    try {
      // First, get the selected voice from storage (or use default if not found)
      const voiceId = await getSelectedVoice(this.defaultVoiceId);
      let modelId = this.defaultModelId;
      
      // Use simba-turbo model if any SSML styling is specified
      if (this.ssmlStyle && (this.ssmlStyle.cadence || this.ssmlStyle.emotion)) {
        modelId = 'simba-turbo';
        logger.info('Using simba-turbo model for voice styling support');
      }
      
      logger.info(`Starting playback with: ${JSON.stringify({ 
        textLength: text.length, 
        voiceId, 
        modelId,
        ssmlStyle: this.ssmlStyle 
      })}`);
      
      // Update selection button to loading state
      dispatchSelectionButtonStateEvent('loading');
      
      // If highlighting is enabled, use synthesizeWithSpeechMarks
      if (this.highlightingEnabled) {
        try {
          // Get both audio and speech marks in one call
          const result = await synthesizeWithSpeechMarks({
            text,
            voiceId,
            modelId,
            ssmlStyle: this.ssmlStyle || undefined,
            returnSpeechMarks: true
          });
          
          if (result.audio && result.speechMarks) {
            // Set up highlighting with the speech marks
            this.setupHighlighting(text, result.speechMarks);
            
            // Create a blob URL for the audio
            const blob = new Blob([result.audio], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            
            // Play the audio
            await this.audioPlayer.playWithUrl(url);
          } else {
            throw new Error('Failed to get both audio and speech marks');
          }
        } catch (syncError) {
          logger.warn(`Error with synthesizeWithSpeechMarks: ${syncError}`);
          
          // Fall back to regular streaming
          await this.audioPlayer.playText(text, voiceId, modelId, this.ssmlStyle || undefined);
        }
      } else {
        // Standard playback without highlighting
        await this.audioPlayer.playText(text, voiceId, modelId, this.ssmlStyle || undefined);
      }
    } catch (error) {
      logger.error(`Error starting playback: ${error}`);
      this.handlePlaybackError(`Failed to start playback: ${error}`);
    }
  }
  
  public stopPlayback(): void {
    this.audioPlayer.stopPlayback();
  }
  
  // Override the existing setPlaybackSpeed method
  public setPlaybackSpeed(speed: number): void {
    this.currentSpeed = speed;
    this.audioPlayer.setPlaybackSpeed(speed);
    
    // Update button text if it exists
    if (this.speedButton) {
      this.speedButton.textContent = `${speed}x`;
    }
    
    // Save speed preference to storage
    chrome.storage.local.set({ playerSpeed: speed }, () => {
      logger.info(`Playback speed saved: ${speed}x`);
    });
  }
  
  /**
   * Load saved playback speed from storage
   */
  private loadPlaybackSpeed(): void {
    chrome.storage.local.get(['playerSpeed'], (result) => {
      if (result.playerSpeed) {
        this.setPlaybackSpeed(result.playerSpeed);
      }
    });
  }
  
  // Method to handle selection button events
  public setupSelectionPlaybackListener(): void {
    // Remove any existing listener first to prevent duplicates
    document.removeEventListener('selection-playback', this.handleSelectionPlaybackEvent);
    
    // Add the event listener
    document.addEventListener('selection-playback', this.handleSelectionPlaybackEvent);
    
    logger.info('Selection playback listener set up');
  }
  
  // Separate method to handle selection playback events to avoid duplicate binding
  public handleSelectionPlaybackEvent = (event: any) => {
    const { action, text } = event.detail;
    
    logger.info(`Event: ${action}${text ? ` (${text.length} chars)` : ''}`);
    
    // Ensure player is visible
    if (!document.getElementById(this.playerId)) {
      logger.info('Creating instance');
      this.create();
    }
    
    if (action === 'play' && text) {
      // If we're in a paused state with the same text, resume playback
      if (this.isPaused && this.currentText === text) {
        logger.info('Resuming paused content');
        this.resumePlayback();
      } else {
        // Otherwise start new playback
        logger.info('Starting new content');
        this.startPlayback(text);
      }
    } else if (action === 'pause') {
      // Handle explicit pause action from selection button
      logger.info('Pausing from selection button');
      this.pausePlayback();
    } else if (action === 'stop') {
      // Just pause instead of stopping completely
      logger.info('Stopping playback');
      this.pausePlayback();
    }
  }
  
  /**
   * Pause playback without clearing buffers
   */
  public pausePlayback(): void {
    logger.info('Pausing playback');
    
    // We don't set isPaused here because the audioPlayer will call 
    // handlePlaybackPause() via the callback, which sets isPaused=true
    
    // Now pause the audio - this will trigger the onPlaybackPause callback
    // which will update the UI and set the isPaused flag
    this.audioPlayer.pausePlayback();
    
    logger.info(`Text: ${this.currentText ? `${this.currentText.substring(0, 20)}...` : 'none'}`);
  }
  
  /**
   * Resume playback from where it was paused
   */
  public async resumePlayback(): Promise<void> {
    logger.info('Resuming playback');
    
    try {
      // Update UI to show loading state
      if (this.playButton) {
        this.playButton.classList.add('active');
        // Could optionally show a loading spinner here
      }
      
      // Update selection button to loading state
      dispatchSelectionButtonStateEvent('loading');
      
      // Start highlighting again if enabled
      if (this.highlightingEnabled) {
        this.textHighlighter.startHighlighting();
      }
      
      // Resume playback
      await this.audioPlayer.resumePlayback();
      
      // Update UI to reflect playing state
      if (this.playButton) {
        this.playButton.innerHTML = ICONS.pause;
        this.playButton.classList.add('active');
      }
      
      // Update the selection button state to speaking
      dispatchSelectionButtonStateEvent('speaking');
      
      this.isPaused = false;
      this.isPlaying = true;
    } catch (error) {
      logger.error(`Resume error: ${error}`);
      this.handlePlaybackError(`Failed to resume playback: ${error}`);
      // If resuming fails, reset the paused state
      this.isPaused = false;
    }
  }
}
