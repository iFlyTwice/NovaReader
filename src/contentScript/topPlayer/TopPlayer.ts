/**
 * Top Player class for the NovaReader extension
 */

// Import CSS to help Vite track dependencies
import '../../../css/top-player.css';

// Import Icons
import { ICONS } from '../utils';
import { createLogger } from '../../utils/logger';

// Create a logger instance for this module
const logger = createLogger('TopPlayer');
import { SettingsDropdown, SettingsDropdownProps } from './components';
import { AudioStreamPlayer } from '../audioPlayer';

// Import utilities
import { 
  extractPageText, 
  fallbackTextExtraction,
  chunkText
} from './utils/contentExtractor';
import {
  isNewsSite,
  insertForCoursera,
  insertForNewsSite,
  insertDefault
} from './utils/domUtils';

// Import handlers
import {
  setupVisibilityListener,
  checkInitialVisibility,
  toggleVisibility
} from './handlers/visibilityHandler';
import {
  handlePlaybackStart,
  handlePlaybackEnd,
  handlePlaybackError,
  updateTimeDisplay,
  showErrorNotification
} from './handlers/playbackHandler';

export class TopPlayer {
  public playerId: string = 'nova-top-player';
  public isPlaying: boolean = false;
  public isVisible: boolean = false;
  public playerElement: HTMLElement | null = null;
  public title: string = 'Listen to This Page';
  public duration: string = '12 min';
  public settingsDropdown: SettingsDropdown | null = null;
  
  // Audio player for text-to-speech
  public audioPlayer: AudioStreamPlayer;
  
  // Current page text
  public pageText: string = '';
  
  // Default voice settings
  public defaultVoiceId: string = '21m00Tcm4TlvDq8ikWAM'; // Example: Adam voice
  public defaultModelId: string = 'eleven_turbo_v2';
  
  // All paragraphs on the page
  public paragraphs: string[] = [];
  
  // Current paragraph index
  public currentParagraphIndex: number = 0;
  
  // Storage for chunked paragraph playback
  public currentParagraphChunks: string[] = [];
  public currentChunkIndex: number = 0;
  
  // Maximum text length for a single playback chunk (to prevent buffer overflow)
  public MAX_CHUNK_LENGTH = 2000;
  
  // Track current state
  public state: 'play' | 'loading' | 'speaking' = 'play';
  
  // Track if DOM observation for player insertion is in progress
  private insertionInProgress: boolean = false;
  
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
    
    // Set up listener for voice selection changes
    this.setupVoiceSelectionListener();
    
    // Set up listener for visibility changes
    setupVisibilityListener(this);
    
    // Check initial visibility setting
    checkInitialVisibility(this);
  }
  
  // Listen for voice selection changes
  private setupVoiceSelectionListener(): void {
    document.addEventListener('voice-selected', (event: any) => {
      const { voiceId } = event.detail;
      logger.info(`Voice selection changed to: ${voiceId}`);
      this.defaultVoiceId = voiceId;
    });
  }
  
  private getPlayerHTML(): string {
    // Calculate initial reading time if we have paragraphs
    if (this.paragraphs.length === 0) {
      // Initial estimate until text is extracted
      this.duration = "1 min";
      
      // Start text extraction here to get a more accurate time as soon as possible
      setTimeout(() => extractPageText(this), 100);
    }
    
    // Simplified UI with settings and close buttons
    return `
      <div class="top-player-content" data-nova-reader="top-player-content">
        <button class="top-player-play-button" id="top-player-play-button" data-nova-reader="play-button">
          <img src="${chrome.runtime.getURL("assets/play.svg")}" alt="Play" width="14" height="14" />
        </button>
        <div class="top-player-title" data-nova-reader="title">${this.title}</div>
        <div class="top-player-duration" data-nova-reader="duration">${this.duration}</div>
        <div class="top-player-controls" data-nova-reader="controls">
          <button class="top-player-settings-button" id="top-player-settings-button" data-nova-reader="settings-button">
            ${ICONS.settings}
          </button>
          <button class="top-player-close-button" id="top-player-close-button" data-nova-reader="close-button">
            ${ICONS.close}
          </button>
        </div>
      </div>
      <div class="top-player-progress-bar" data-nova-reader="progress-bar">
        <div class="top-player-progress" id="top-player-progress" data-nova-reader="progress"></div>
      </div>
    `;
  }
  
  public create(): void {
    logger.info('Creating top player');
    
    // Check if player already exists to avoid duplicates
    if (document.getElementById(this.playerId)) {
      logger.info('Player already exists, not creating duplicate');
      return;
    }
    
    // Check if insertion is already in progress
    if (this.insertionInProgress) {
      logger.info('Insertion already in progress');
      return;
    }
    
    this.insertionInProgress = true;
    
    // Create player container
    const player = document.createElement('div');
    player.id = this.playerId;
    player.className = 'top-player-container';
    
    // Add shadow to the top player similar to the one in SidePanel
    player.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 20px rgba(0, 0, 0, 0.2)';
    
    // Set player HTML
    player.innerHTML = this.getPlayerHTML();
    
    // Get the hostname to detect specific sites
    const hostname = window.location.hostname;
    
    // Special handling for Coursera (uses enhanced insertion with retry)
    if (hostname.includes('coursera.org')) {
      logger.info('Detected Coursera site, using robust insertion');
      insertForCoursera(player);
    } else if (isNewsSite(hostname)) {
      // Special handling for news sites
      logger.info('Detected news site');
      insertForNewsSite(player);
    } else {
      // Default approach: find a suitable H1 or content container
      logger.info('Using default insertion');
      insertDefault(player);
    }
    
    // Save reference to player
    this.playerElement = player;
    this.isVisible = true;
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Listen for toggle-panel event (from the dropdown settings option)
    document.addEventListener('toggle-panel', () => {
      logger.info('Received toggle-panel event');
      // Dispatch an event that the parent content script can listen for
      const event = new CustomEvent('open-panel');
      document.dispatchEvent(event);
    });
    
    // Extract page text after a short delay to ensure the DOM is settled
    // Only if we don't already have paragraphs
    setTimeout(() => {
      if (this.paragraphs.length === 0) {
        logger.info('Extracting page text');
        extractPageText(this);
        
        // If no paragraphs were found, try again with a different approach
        if (this.paragraphs.length === 0) {
          logger.debug('Using fallback extraction method');
          // Use a simpler but more aggressive extraction method
          fallbackTextExtraction(this);
        }
      } else {
        logger.info('Already have paragraphs, skipping extraction');
      }
    }, 1000);
    
    // Double-check visibility after a delay to ensure consistency with settings
    setTimeout(() => {
      chrome.storage.local.get(['topPlayerEnabled'], (result) => {
        const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
        logger.info(`Double-checking visibility: should be ${isVisible ? 'visible' : 'hidden'}`);
        
        if (!isVisible && this.playerElement) {
          // If player shouldn't be visible but exists, remove it
          logger.info('Correcting visibility - removing player');
          this.remove();
        } else if (isVisible && !this.playerElement) {
          // If player should be visible but doesn't exist, recreate it
          logger.info('Correcting visibility - showing player');
          this.show();
        }
      });
      
      // Reset insertion flag
      this.insertionInProgress = false;
    }, 1500);
  }
  
  private setupEventHandlers(): void {
    if (!this.playerElement) return;
    
    // Play/Pause button
    const playButton = this.playerElement.querySelector('#top-player-play-button');
    if (playButton) {
      playButton.addEventListener('click', () => {
        this.togglePlayPause();
      });
    }
    
    // Settings button
    const settingsButton = this.playerElement.querySelector('#top-player-settings-button');
    if (settingsButton) {
      settingsButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling up
        
        // If dropdown is already open, close it
        if (this.settingsDropdown?.isOpen()) {
          this.closeSettingsDropdown();
          return;
        }
        
        // Create the dropdown with reference to the settings button
        this.settingsDropdown = new SettingsDropdown({
          buttonElement: settingsButton as HTMLElement,
          onSettingsClick: () => {
            logger.info('Settings clicked');
            // You would typically open settings here
          },
          onHidePlayerClick: () => {
            logger.info('Hide player clicked');
            this.hide();
          },
          onClose: () => {
            this.settingsDropdown = null;
          }
        });
        
        // Append the dropdown to the document body
        document.body.appendChild(this.settingsDropdown.render());
      });
    }
    
    // Close button
    const closeButton = this.playerElement.querySelector('#top-player-close-button');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling up
        this.hide();
      });
    }
  }
  
  private closeSettingsDropdown(): void {
    if (this.settingsDropdown) {
      this.settingsDropdown.close();
      this.settingsDropdown = null;
    }
  }
  
  // Audio player event handlers
  private handlePlaybackStart(): void {
    handlePlaybackStart(this);
  }
  
  private handlePlaybackEnd(): void {
    handlePlaybackEnd(this);
  }
  
  private handlePlaybackError(error: string): void {
    handlePlaybackError(this, error);
  }
  
  /**
   * Show an error notification to the user
   */
  public showErrorNotification(message: string): void {
    showErrorNotification(message);
  }
  
  private updateTimeDisplay(currentTime: number, duration: number): void {
    updateTimeDisplay(this, currentTime, duration);
  }
  
  public setState(newState: 'play' | 'loading' | 'speaking'): void {
    this.state = newState;
    
    if (!this.playerElement) return;
    
    const playButton = this.playerElement.querySelector('#top-player-play-button');
    if (!playButton) return;
    
    switch (newState) {
      case 'play':
        playButton.innerHTML = `<img src="${chrome.runtime.getURL("assets/play.svg")}" alt="Play" width="14" height="14" />`;
        this.isPlaying = false;
        break;
      case 'loading':
        playButton.innerHTML = `<img src="${chrome.runtime.getURL("assets/spinner.svg")}" alt="Loading" width="14" height="14" />`;
        // Set timeout to revert to play state if loading takes too long
        setTimeout(() => {
          if (this.state === 'loading') {
            this.setState('play');
          }
        }, 8000);
        break;
      case 'speaking':
        playButton.innerHTML = `<img src="${chrome.runtime.getURL("assets/pause.svg")}" alt="Pause" width="14" height="14" />`;
        this.isPlaying = true;
        break;
    }
  }

  private togglePlayPause(): void {
    if (this.state === 'speaking') {
      // Stop playback
      this.stopPlayback();
    } else if (this.state === 'play') {
      // Start playback
      this.startPlayback();
    }
    // Do nothing if already in loading state
  }
  
  // Start playback of the current paragraph and set up to continue to the next
  private async startPlayback(): Promise<void> {
    logger.info(`startPlayback called, paragraphs length: ${this.paragraphs.length}`);
    
    // Check if we have paragraphs
    if (this.paragraphs.length === 0) {
      logger.warn('No paragraphs available for playback');
      // Try re-extracting text content
      extractPageText(this);
      
      // Check again after re-extraction
      if (this.paragraphs.length === 0) {
        logger.error('Still no paragraphs after re-extraction, cannot proceed');
        return;
      } else {
        logger.info(`Successfully extracted ${this.paragraphs.length} paragraphs after retry`);
      }
    }
    
    // Set loading state
    this.setState('loading');
    
    try {
      // Get the selected voice from storage (or use default if not found)
      const voiceId = await this.getSelectedVoice();
      const modelId = this.defaultModelId;
      
      // Get current paragraph text
      const currentText = this.paragraphs[this.currentParagraphIndex];
      
      // Check if the paragraph is too long and needs to be chunked
      if (currentText.length > this.MAX_CHUNK_LENGTH) {
        // Split the text into chunks
        const chunks = chunkText(currentText, this.MAX_CHUNK_LENGTH);
        logger.info(`Text too long (${currentText.length} chars), split into ${chunks.length} chunks`);
        
        // Store chunks for the current paragraph
        this.currentParagraphChunks = chunks;
        this.currentChunkIndex = 0;
        
        // Play the first chunk
        this.playChunk();
      } else {
        // Normal playback for reasonable length paragraphs
        logger.info(`Starting playback of paragraph ${this.currentParagraphIndex + 1}/${this.paragraphs.length}: ${JSON.stringify({ 
          textPreview: currentText.substring(0, 50) + '...',
          textLength: currentText.length, 
          voiceId,
          modelId 
        })}`);
        
        // Set up callback for playback end to move to next paragraph
        this.audioPlayer.setCallbacks({
          onPlaybackStart: () => this.handlePlaybackStart(),
          onPlaybackEnd: () => this.handleParagraphEnd(),
          onPlaybackError: (error) => this.handlePlaybackError(error),
          onTimeUpdate: (currentTime, duration) => this.updateTimeDisplay(currentTime, duration)
        });
        
        // Start playback with the audioPlayer
        await this.audioPlayer.playText(currentText, voiceId, modelId);
      }
    } catch (error) {
      logger.error(`Error starting playback: ${error}`);
      this.handlePlaybackError(`Failed to start playback: ${error}`);
    }
  }
  
  /**
   * Play a chunk of the current paragraph
   */
  private playChunk(): void {
    if (this.currentChunkIndex >= this.currentParagraphChunks.length) {
      // We've played all chunks, move to the next paragraph
      logger.info('All chunks played, moving to next paragraph');
      this.handleParagraphEnd();
      return;
    }
    
    const chunk = this.currentParagraphChunks[this.currentChunkIndex];
    logger.info(`Playing chunk ${this.currentChunkIndex + 1}/${this.currentParagraphChunks.length}, length: ${chunk.length}`);
    
    // Track the position in the original text for this chunk
    const overallPosition = this.currentParagraphChunks
      .slice(0, this.currentChunkIndex)
      .reduce((sum, chunkText) => sum + chunkText.length, 0);
    
    logger.info(`Starting from character position ${overallPosition} in the complete text`);
    
    // Set up callback to play the next chunk when this one finishes
    this.audioPlayer.setCallbacks({
      onPlaybackStart: () => this.handlePlaybackStart(),
      onPlaybackEnd: () => this.handleChunkEnd(),
      onPlaybackError: (error) => this.handlePlaybackError(error),
      onTimeUpdate: (currentTime, duration) => this.updateTimeDisplay(currentTime, duration)
    });
    
    // Play this chunk
    this.audioPlayer.playText(chunk, this.defaultVoiceId, this.defaultModelId)
      .catch(error => {
        logger.error(`Error playing chunk: ${error}`);
        this.handlePlaybackError(`Chunk playback error: ${error}`);
      });
  }
  
  /**
   * Handle the end of a chunk playback
   */
  private handleChunkEnd(): void {
    logger.info('Chunk playback ended');
    
    // Get the current chunk for logging
    const currentChunk = this.currentParagraphChunks[this.currentChunkIndex];
    
    // Move to the next chunk
    this.currentChunkIndex++;
    
    // Calculate the next chunk's position
    const nextChunkPosition = this.currentParagraphChunks
      .slice(0, this.currentChunkIndex)
      .reduce((sum, chunkText) => sum + chunkText.length, 0);
    
    logger.info(`Moving to next chunk at position ${nextChunkPosition}, completed chunk length: ${currentChunk.length}`);
    
    // Play the next chunk immediately to ensure continuous playback
    // Using a minimal delay to prevent potential buffer issues
    setTimeout(() => {
      this.playChunk();
    }, 50);
  }
  
  // Handle end of paragraph playback
  private handleParagraphEnd(): void {
    logger.info('Paragraph playback ended');
    
    // Move to next paragraph
    this.currentParagraphIndex++;
    
    // If we've reached the end of all paragraphs, reset to beginning
    if (this.currentParagraphIndex >= this.paragraphs.length) {
      this.currentParagraphIndex = 0;
      this.isPlaying = false;
      this.setState('play');
      this.pauseProgressAnimation();
      logger.info('Reached end of all paragraphs, stopping playback');
      return;
    }
    
    // Continue with next paragraph
    logger.info(`Moving to paragraph ${this.currentParagraphIndex + 1}/${this.paragraphs.length}`);
    this.startPlayback();
  }
  
  // Stop playback
  public stopPlayback(): void {
    // Stop the audio player
    this.audioPlayer.stopPlayback();
    
    // Reset paragraph index to beginning
    this.currentParagraphIndex = 0;
    
    // Update state
    this.isPlaying = false;
    this.setState('play');
  }
  
  // Get the user's selected voice from Chrome storage
  private async getSelectedVoice(): Promise<string> {
    try {
      // First check if we already have a voice ID from a voice-selected event
      // This ensures we always use the most recently selected voice
      if (this.defaultVoiceId !== '21m00Tcm4TlvDq8ikWAM') {
        // Log that we're using the voice ID from recent selection
        logger.info(`Using voice ID from most recent selection: ${this.defaultVoiceId}`);
        return this.defaultVoiceId;
      }
      
      // Get voice from Chrome storage as a backup
      return new Promise<string>((resolve) => {
        chrome.storage.local.get(['selectedVoiceId'], (result) => {
          if (result && result.selectedVoiceId) {
            logger.info(`Retrieved voice ID from storage: ${result.selectedVoiceId}`);
            // Update our cached voice ID for future use
            this.defaultVoiceId = result.selectedVoiceId;
            resolve(result.selectedVoiceId);
          } else {
            logger.info(`No voice ID in storage, using default: ${this.defaultVoiceId}`);
            resolve(this.defaultVoiceId);
          }
        });
      });
    } catch (error) {
      logger.error(`Error getting selected voice: ${error}`);
      return this.defaultVoiceId;
    }
  }
  
  public startProgressAnimation(): void {
    // Initialize progress bar
    const progressBar = this.playerElement?.querySelector('#top-player-progress') as HTMLElement;
    if (progressBar) {
      // Reset to 0
      progressBar.style.width = '0%';
      
      // The progress will be updated by updateTimeDisplay during playback
    }
  }
  
  public pauseProgressAnimation(): void {
    // Nothing to do here - progress updates stop when audio stops
  }
  
  public toggle(): void {
    toggleVisibility(this);
  }
  
  public hide(): void {
    logger.info('Hiding top player');
    
    if (!this.playerElement) return;
    
    // Add fade-out animation for better UX
    this.playerElement.style.transition = 'opacity 0.3s ease';
    this.playerElement.style.opacity = '0';
    
    // After animation completes, remove from DOM
    setTimeout(() => {
      if (this.playerElement && this.playerElement.parentNode) {
        this.playerElement.parentNode.removeChild(this.playerElement);
        this.playerElement = null;
      }
      this.isVisible = false;
    }, 300);
  }
  
  public show(): void {
    logger.info('Showing top player');
    
    if (!this.playerElement) {
      this.create();
    } else {
      // If player exists but is hidden, show it with animation
      this.playerElement.style.display = 'block';
      this.playerElement.style.opacity = '0';
      
      // Force reflow for animation
      void this.playerElement.offsetWidth;
      
      // Fade in
      this.playerElement.style.transition = 'opacity 0.3s ease';
      this.playerElement.style.opacity = '1';
      this.isVisible = true;
    }
  }
  
  public isPlayerVisible(): boolean {
    return this.isVisible;
  }
  
  public setTitle(title: string): void {
    this.title = title;
    
    if (!this.playerElement) return;
    
    const titleElement = this.playerElement.querySelector('.top-player-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }
  
  public setDuration(duration: string): void {
    this.duration = duration;
    
    if (!this.playerElement) return;
    
    const durationElement = this.playerElement.querySelector('.top-player-duration');
    if (durationElement) {
      durationElement.textContent = duration;
    }
  }
  
  public remove(): void {
    if (!this.playerElement) return;
    
    // Stop any active playback
    this.stopPlayback();
    
    // Close settings dropdown if open
    this.closeSettingsDropdown();
    
    // Remove from DOM
    this.playerElement.remove();
    this.playerElement = null;
    this.isVisible = false;
  }
}
