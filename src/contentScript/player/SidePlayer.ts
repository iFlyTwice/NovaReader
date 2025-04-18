/**
 * Side Player class for the NovaReader extension
 */

// SVG Icons
import { ICONS } from '../utils';
// Import CSS to help Vite track dependencies
import '../../../css/player.css';
// Import audio player for streaming
import { AudioStreamPlayer } from '../audioPlayer';
// Sentence highlighter removed

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

export class SidePlayer {
  // Make these public for the event handlers to access
  public playerId: string = 'extension-side-player';
  public currentText: string = '';
  
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private playerElement: HTMLElement | null = null;
  private playButton: HTMLElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  
  // Audio streaming player
  private audioPlayer: AudioStreamPlayer;
  
  // Sentence highlighter functionality removed
  
  // Default voice settings - use proper Speechify voice ID
  private defaultVoiceId: string = 'en-US-Neural2-F'; // Speechify female voice
  private defaultModelId: string = 'simba-english'; // Speechify model

  constructor() {
    // Initialize the audio player
    this.audioPlayer = new AudioStreamPlayer();
    
    // Set up callbacks for audio player events
    this.audioPlayer.setCallbacks({
      onPlaybackStart: () => this.handlePlaybackStart(),
      onPlaybackEnd: () => this.handlePlaybackEnd(),
      onPlaybackPause: () => this.handlePlaybackPause(),
      onPlaybackError: (error) => this.handlePlaybackError(error),
      onTimeUpdate: (currentTime, duration) => this.updateTimeDisplay(currentTime, duration)
    });
    
    // Immediately set up the selection playback listener
    // to ensure we don't miss any events
    this.setupSelectionPlaybackListener();
    
    // Set up listener to ensure player is visible before playback
    this.setupEnsurePlayerVisibleListener();
    
    console.log('📱 [Player] Initialized and ready');
  }
  
  // New method to ensure player is visible before playback
  private setupEnsurePlayerVisibleListener(): void {
    document.addEventListener('ensure-player-visible', (event: any) => {
      const { text } = event.detail;
      console.log('📱 [Player] Ensuring visibility');
      
      // If player isn't visible, create it
      if (!document.getElementById(this.playerId)) {
        this.create();
        console.log('📱 [Player] Created new player instance');
      }
      
      // Store the text so it can be played
      if (text) {
        this.currentText = text;
        console.log('📱 [Player] Text stored: ', 
                    text.length > 20 ? `${text.substring(0, 20)}...` : text);
      }
    });
  }
  
  // Audio player event handlers
  private handlePlaybackStart(): void {
    this.isPlaying = true;
    handlePlaybackStart(this.playButton);
  }
  
  private handlePlaybackEnd(): void {
    this.isPlaying = false;
    this.isPaused = false;
    handlePlaybackEnd(this.playButton);
    
    // Sentence highlighting removed
  }
  
  // New method specifically for pause events
  private handlePlaybackPause(): void {
    this.isPlaying = false;
    this.isPaused = true;
    handlePlaybackPause(this.playButton);
  }
  
  private handlePlaybackError(error: string): void {
    handlePlaybackError(error, this.playButton);
  }
  
  private updateTimeDisplay(currentTime: number, duration: number): void {
    // Update the time display in the player UI
    updateTimeDisplay(this.timeDisplay, currentTime, duration);
    
    // Sentence highlighting removed
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
    
    // Add time display
    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'time-display';
    timeDisplay.textContent = '0:00';
    this.timeDisplay = timeDisplay;
    
    // Play button
    const playButton = createButton(ICONS.play, 'Play/Pause', () => {
      console.log('[SidePlayer] Play button clicked, isPlaying:', this.isPlaying, 'isPaused:', this.isPaused);
      
      if (this.isPlaying) {
        // If currently playing, pause instead of stop
        console.log('[SidePlayer] Currently playing, will pause');
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
        console.log('[SidePlayer] Currently paused with text, will resume');
        this.resumePlayback();
      } else if (this.currentText) {
        // If not playing or paused but have text, start playing
        console.log('[SidePlayer] Not playing but have text, will start');
        this.startPlayback(this.currentText);
      } else {
        // Try to get selected text if no current text
        const selectedText = window.getSelection()?.toString().trim();
        if (selectedText) {
          console.log('[SidePlayer] No stored text, using selection');
          this.startPlayback(selectedText);
        } else {
          console.log('[SidePlayer] No text selected or stored');
        }
      }
    });
    this.playButton = playButton;
    
    // Screenshot button
    const screenshotButton = createButton(ICONS.screenshot, 'Screenshot', () => {
      console.log('Screenshot clicked');
      // Add visual feedback
      addClickEffect(screenshotButton);
    });
    
    // Select Voice button with microphone icon that transforms to X
    const selectVoiceButton = createButton(ICONS.microphone, 'Select Voice', () => {
      console.log('Select Voice clicked');
      
      // Check if voice selector is already open
      const isVoiceSelectorOpen = !!document.getElementById('extension-voice-selector');
      
      // Toggle the icon based on the voice selector state
      if (isVoiceSelectorOpen) {
        // Voice selector is open and will be closed, change back to microphone
        setTimeout(() => {
          selectVoiceButton.innerHTML = ICONS.microphone;
          selectVoiceButton.setAttribute('data-state', 'closed');
        }, 150);
      } else {
        // Voice selector is closed and will be opened, change to X
        selectVoiceButton.innerHTML = ICONS.close;
        selectVoiceButton.setAttribute('data-state', 'open');
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
    player.appendChild(dividerAfterPlay); // Add divider after play button
    player.appendChild(screenshotButton);
    player.appendChild(selectVoiceButton);
    player.appendChild(settingsButton);
    player.appendChild(divider1);
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
  
  // Method to handle text playback
  public async startPlayback(text: string): Promise<void> {
    if (!text.trim()) {
      console.warn('No text provided for playback');
      return;
    }
    
    // Stop any existing playback first
    if (this.isPlaying || this.isPaused) {
      console.log('[SidePlayer] Stopping previous playback before starting new one');
      this.stopPlayback();
    }
    
    this.currentText = text;
    
    try {
      // First, get the selected voice from storage (or use default if not found)
      const voiceId = await getSelectedVoice(this.defaultVoiceId);
      const modelId = this.defaultModelId;
      
      console.log('[SidePlayer] Starting playback with:', { 
        textLength: text.length, 
        voiceId, 
        modelId 
      });
      
      // Update selection button to loading state
      dispatchSelectionButtonStateEvent('loading');
      
      // Try playback with the audioPlayer
      try {
        await this.audioPlayer.playText(text, voiceId, modelId);
      } catch (audioPlayerError) {
        // If the AudioStreamPlayer fails, try the alternate approach
        console.warn('[SidePlayer] AudioStreamPlayer failed, trying fallback approach:', audioPlayerError);
        
        // Import necessary functions directly
        const { textToSpeech } = await import('../speechifyApi');
        
        // Get the audio data directly
        const audioData = await textToSpeech(text, voiceId, modelId);
        
        if (!audioData) {
          throw new Error('Failed to get audio data from textToSpeech');
        }
        
        // Create blob from audio data
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        // Create audio element
        const audio = new Audio(url);
        
        // Set up audio events
        audio.onended = () => {
          console.log('[SidePlayer] Fallback playback completed');
          URL.revokeObjectURL(url); // Clean up
          this.handlePlaybackEnd();
        };
        
        audio.ontimeupdate = () => {
          if (audio.duration) {
            this.updateTimeDisplay(audio.currentTime, audio.duration);
          }
        };
        
        audio.onerror = (event) => {
          console.error('[SidePlayer] Fallback audio playback error:', event);
          URL.revokeObjectURL(url); // Clean up
          this.handlePlaybackError('Error during fallback audio playback');
        };
        
        // Start playback
        await audio.play();
        console.log('[SidePlayer] Fallback audio playback started');
        this.handlePlaybackStart();
      }
    } catch (error) {
      console.error('[SidePlayer] Error starting playback:', error);
      this.handlePlaybackError(`Failed to start playback: ${error}`);
    }
  }
  
  // Sentence highlighter functionality removed
  
  public stopPlayback(): void {
    this.audioPlayer.stopPlayback();
  }
  
  // Set playback speed (could be connected to a speed control in UI)
  public setPlaybackSpeed(speed: number): void {
    this.audioPlayer.setPlaybackSpeed(speed);
  }
  
  // Method to handle selection button events
  public setupSelectionPlaybackListener(): void {
    // Remove any existing listener first to prevent duplicates
    document.removeEventListener('selection-playback', this.handleSelectionPlaybackEvent);
    
    // Add the event listener
    document.addEventListener('selection-playback', this.handleSelectionPlaybackEvent);
    
    console.log('[SidePlayer] Selection playback listener set up');
  }
  
  // Separate method to handle selection playback events to avoid duplicate binding
  public handleSelectionPlaybackEvent = (event: any) => {
    const { action, text } = event.detail;
    
    console.log(`📱 [Player] Event: ${action}${text ? ` (${text.length} chars)` : ''}`);
    
    // Ensure player is visible
    if (!document.getElementById(this.playerId)) {
      console.log('📱 [Player] Creating instance');
      this.create();
    }
    
    if (action === 'play' && text) {
      // If we're in a paused state with the same text, resume playback
      if (this.isPaused && this.currentText === text) {
        console.log('📱 [Player] Resuming paused content');
        this.resumePlayback();
      } else {
        // Otherwise start new playback
        console.log('📱 [Player] Starting new content');
        this.startPlayback(text);
      }
    } else if (action === 'pause') {
      // Handle explicit pause action from selection button
      console.log('📱 [Player] Pausing from selection button');
      this.pausePlayback();
    } else if (action === 'stop') {
      // Just pause instead of stopping completely
      console.log('📱 [Player] Stopping playback');
      this.pausePlayback();
    }
  }
  
  /**
   * Pause playback without clearing buffers
   */
  public pausePlayback(): void {
    console.log('📱 [Player] Pausing playback');
    
    // We don't set isPaused here because the audioPlayer will call 
    // handlePlaybackPause() via the callback, which sets isPaused=true
    
    // Now pause the audio - this will trigger the onPlaybackPause callback
    // which will update the UI and set the isPaused flag
    this.audioPlayer.pausePlayback();
    
    console.log('📱 [Player] Text:', 
                this.currentText ? `${this.currentText.substring(0, 20)}...` : 'none');
  }
  
  /**
   * Resume playback from where it was paused
   */
  public async resumePlayback(): Promise<void> {
    console.log('📱 [Player] Resuming playback');
    
    try {
      // Update UI to show loading state
      if (this.playButton) {
        this.playButton.classList.add('active');
        // Could optionally show a loading spinner here
      }
      
      // Update selection button to loading state
      dispatchSelectionButtonStateEvent('loading');
      
      // Sentence highlighting functionality removed
      
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
      console.error('📱 [Player] ⚠️ Resume error:', error);
      this.handlePlaybackError(`Failed to resume playback: ${error}`);
      // If resuming fails, reset the paused state
      this.isPaused = false;
    }
  }
}
