// SVG Icons
import { ICONS } from './utils';
// Import CSS to help Vite track dependencies
import '../../css/player.css';
// Import audio player for streaming
import { AudioStreamPlayer } from './audioPlayer';

export class SidePlayer {
  private playerId: string = 'extension-side-player';
  private isPlaying: boolean = false;
  private playerElement: HTMLElement | null = null;
  private currentText: string = '';
  private playButton: HTMLElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  
  // Audio streaming player
  private audioPlayer: AudioStreamPlayer;
  
  // Default voice settings - would be replaced by user settings in production
  private defaultVoiceId: string = '21m00Tcm4TlvDq8ikWAM'; // Example: Adam voice
  private defaultModelId: string = 'eleven_turbo_v2';

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
    if (this.playButton) {
      // Add active class
      this.playButton.classList.add('active');
      
      // Change icon to pause
      this.playButton.innerHTML = ICONS.pause;
    }
    
    // Dispatch event to update selection button state
    this.dispatchSelectionButtonStateEvent('speaking');
  }
  
  private handlePlaybackEnd(): void {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.playButton) {
      // Remove active class
      this.playButton.classList.remove('active');
      
      // Change icon back to play
      this.playButton.innerHTML = ICONS.play;
    }
    
    // Dispatch event to update selection button state
    this.dispatchSelectionButtonStateEvent('play');
  }
  
  // New method specifically for pause events
  private handlePlaybackPause(): void {
    this.isPlaying = false;
    this.isPaused = true;
    
    if (this.playButton) {
      // Remove active class
      this.playButton.classList.remove('active');
      
      // Change icon back to play
      this.playButton.innerHTML = ICONS.play;
    }
    
    // Dispatch event to update selection button state
    this.dispatchSelectionButtonStateEvent('play');
    
    console.log('📱 [Player] Paused state active');
  }
  
  private handlePlaybackError(error: string): void {
    console.error('Playback error:', error);
    // Notify user of the error?
    this.handlePlaybackEnd(); // Reset state
  }
  
  private updateTimeDisplay(currentTime: number, duration: number): void {
    if (this.timeDisplay) {
      const minutes = Math.floor(currentTime / 60);
      const seconds = Math.floor(currentTime % 60);
      
      // If duration is known, finite, and not NaN, show time as current/total
      if (duration && isFinite(duration) && !isNaN(duration)) {
        const totalMinutes = Math.floor(duration / 60);
        const totalSeconds = Math.floor(duration % 60);
        this.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}/${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
      } else {
        // Otherwise just show current time without the infinity symbol
        this.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }
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
    const playButton = this.createButton('play', 'Play/Pause', () => {
      console.log('[SidePlayer] Play button clicked, isPlaying:', this.isPlaying, 'isPaused:', this.isPaused);
      
      if (this.isPlaying) {
        // If currently playing, pause instead of stop
        console.log('[SidePlayer] Currently playing, will pause');
        this.pausePlayback();
        
        // Notify the selection button about the pause
        this.dispatchSelectionButtonStateEvent('play');
        
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
    
    // Thumbs down button (dislike)
    const thumbsDownButton = this.createButton('thumbsDown', 'Dislike', () => {
      console.log('Dislike clicked');
      // Add visual feedback
      this.addClickEffect(thumbsDownButton);
    });
    
    // Screenshot button
    const screenshotButton = this.createButton('screenshot', 'Screenshot', () => {
      console.log('Screenshot clicked');
      // Add visual feedback
      this.addClickEffect(screenshotButton);
    });
    
    // Select Voice button with microphone icon
    const selectVoiceButton = this.createButton('microphone', 'Select Voice', () => {
      console.log('Select Voice clicked');
      // Dispatch event to toggle voice selector
      const event = new CustomEvent('toggle-voice-selector');
      document.dispatchEvent(event);
      // Add visual feedback
      this.addClickEffect(selectVoiceButton);
    });
    
    // Settings button (with red dot)
    const settingsButton = this.createButton('settings', 'Settings', () => {
      // This will be handled by the panel module
      const event = new CustomEvent('toggle-panel');
      document.dispatchEvent(event);
      // Add visual feedback
      this.addClickEffect(settingsButton);
    });
    settingsButton.classList.add('settings-button');
    
    // Divider
    const divider1 = document.createElement('div');
    divider1.className = 'player-divider';
    
    // Close button
    const closeButton = this.createButton('close', 'Close', () => {
      this.remove();
      // Add visual feedback
      this.addClickEffect(closeButton);
    });
    
    // Create a divider for after the play button
    const dividerAfterPlay = document.createElement('div');
    dividerAfterPlay.className = 'player-divider';
    
    // Append all elements to player in the order shown in the screenshot
    player.appendChild(timeDisplay);
    player.appendChild(playButton);
    player.appendChild(dividerAfterPlay); // Add divider after play button
    player.appendChild(thumbsDownButton);
    player.appendChild(screenshotButton);
    player.appendChild(selectVoiceButton);
    player.appendChild(settingsButton);
    player.appendChild(divider1);
    player.appendChild(closeButton);
    
    // Add player to page
    document.body.appendChild(player);
    this.playerElement = player;
  }

  private createButton(iconName: keyof typeof ICONS, title: string, clickHandler: () => void): HTMLElement {
    const button = document.createElement('div');
    button.className = 'player-button';
    button.innerHTML = ICONS[iconName];
    button.title = title;
    button.addEventListener('click', clickHandler);
    return button;
  }
  
  private addClickEffect(element: HTMLElement): void {
    // Add a quick scale animation for feedback
    element.style.transform = 'scale(0.9)';
    setTimeout(() => {
      element.style.transform = '';
    }, 150);
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
    
    this.currentText = text;
    
    try {
      // First, get the selected voice from storage (or use default if not found)
      const voiceId = await this.getSelectedVoice();
      const modelId = this.defaultModelId;
      
      console.log('[SidePlayer] Starting playback with:', { 
        textLength: text.length, 
        voiceId, 
        modelId 
      });
      
      // Update selection button to loading state
      this.dispatchSelectionButtonStateEvent('loading');
      
      // Start playback with the audioPlayer
      await this.audioPlayer.playText(text, voiceId, modelId);
    } catch (error) {
      console.error('[SidePlayer] Error starting playback:', error);
      this.handlePlaybackError(`Failed to start playback: ${error}`);
    }
  }
  
  // Get the user's selected voice from Chrome storage
  private async getSelectedVoice(): Promise<string> {
    try {
      // Get voice from Chrome storage
      return new Promise<string>((resolve) => {
        chrome.storage.local.get(['selectedVoiceId'], (result) => {
          if (result && result.selectedVoiceId) {
            console.log('[SidePlayer] Retrieved voice ID from storage:', result.selectedVoiceId);
            resolve(result.selectedVoiceId);
          } else {
            console.log('[SidePlayer] No voice ID in storage, using default:', this.defaultVoiceId);
            resolve(this.defaultVoiceId);
          }
        });
      });
    } catch (error) {
      console.error('[SidePlayer] Error getting selected voice:', error);
      return this.defaultVoiceId;
    }
  }
  
  public stopPlayback(): void {
    this.audioPlayer.stopPlayback();
  }
  
  // Set playback speed (could be connected to a speed control in UI)
  public setPlaybackSpeed(speed: number): void {
    this.audioPlayer.setPlaybackSpeed(speed);
  }
  
  private dispatchSelectionButtonStateEvent(state: 'play' | 'loading' | 'speaking'): void {
    const event = new CustomEvent('selection-button-state', {
      detail: { state }
    });
    document.dispatchEvent(event);
  }
  
  // Track the currently selected text for pause/resume functionality
  private selectedTextForPause: string = '';
  private isPaused: boolean = false;

  // Method to handle selection button events
  public setupSelectionPlaybackListener(): void {
    // Remove any existing listener first to prevent duplicates
    document.removeEventListener('selection-playback', this.handleSelectionPlaybackEvent);
    
    // Add the event listener
    document.addEventListener('selection-playback', this.handleSelectionPlaybackEvent);
    
    console.log('[SidePlayer] Selection playback listener set up');
  }
  
  // Separate method to handle selection playback events to avoid duplicate binding
  private handleSelectionPlaybackEvent = (event: any) => {
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
      this.dispatchSelectionButtonStateEvent('loading');
      
      // Resume playback
      await this.audioPlayer.resumePlayback();
      
      // Update UI to reflect playing state
      if (this.playButton) {
        this.playButton.innerHTML = ICONS.pause;
        this.playButton.classList.add('active');
      }
      
      // Update the selection button state to speaking
      this.dispatchSelectionButtonStateEvent('speaking');
      
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