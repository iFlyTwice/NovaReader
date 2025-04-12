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
      onPlaybackError: (error) => this.handlePlaybackError(error),
      onTimeUpdate: (currentTime, duration) => this.updateTimeDisplay(currentTime, duration)
    });
  }
  
  // Audio player event handlers
  private handlePlaybackStart(): void {
    this.isPlaying = true;
    if (this.playButton) {
      // Add active class
      this.playButton.classList.add('active');
      
      // Change icon to stop
      this.playButton.innerHTML = ICONS.stop;
    }
    
    // Dispatch event to update selection button state
    this.dispatchSelectionButtonStateEvent('speaking');
  }
  
  private handlePlaybackEnd(): void {
    this.isPlaying = false;
    if (this.playButton) {
      // Remove active class
      this.playButton.classList.remove('active');
      
      // Change icon back to play
      this.playButton.innerHTML = ICONS.play;
    }
    
    // Dispatch event to update selection button state
    this.dispatchSelectionButtonStateEvent('play');
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
      
      // If duration is known, show time as current/total
      if (duration && !isNaN(duration)) {
        const totalMinutes = Math.floor(duration / 60);
        const totalSeconds = Math.floor(duration % 60);
        this.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}/${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
      } else {
        // Otherwise just show current time
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
      if (this.isPlaying) {
        this.stopPlayback();
      } else if (this.currentText) {
        this.startPlayback(this.currentText);
      } else {
        // Try to get selected text if no current text
        const selectedText = window.getSelection()?.toString().trim();
        if (selectedText) {
          this.startPlayback(selectedText);
        } else {
          console.log('No text selected or stored');
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
    
    // Select Voice button (replaces Waveform button)
    const selectVoiceButton = this.createButton('waveform', 'Select Voice', () => {
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
  
  // Method to handle selection button events
  public setupSelectionPlaybackListener(): void {
    document.addEventListener('selection-playback', (event: any) => {
      const { action, text } = event.detail;
      
      if (action === 'play' && text) {
        this.startPlayback(text);
      } else if (action === 'stop') {
        this.stopPlayback();
      }
    });
  }
}
