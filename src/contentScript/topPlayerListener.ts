// Add this code to the TopPlayer.ts file

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
  
  // Extract page text for the "Listen to This Page" feature
  this.extractPageText();
  
  // Set up listener for voice selection changes
  this.setupVoiceSelectionListener();
  
  // Set up listener for visibility changes
  this.setupVisibilityListener();
  
  // Check initial visibility setting
  this.checkInitialVisibility();
}

// Check the initial visibility from storage
private checkInitialVisibility(): void {
  chrome.storage.local.get(['topPlayerEnabled'], (result) => {
    const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
    
    if (!isVisible && this.isVisible) {
      // Hide the player if it was created but should be hidden
      this.hide();
    } else if (isVisible && !this.isVisible && !this.playerElement) {
      // Show the player if it's not visible but should be
      this.show();
    }
    
    console.log(`📖 [TopPlayer] Initial visibility set to ${isVisible ? 'visible' : 'hidden'}`);
  });
}

// Listen for visibility change events
private setupVisibilityListener(): void {
  document.addEventListener('update-top-player-visibility', (event: any) => {
    const { visible } = event.detail;
    console.log(`📖 [TopPlayer] Visibility update event received: ${visible ? 'show' : 'hide'}`);
    
    if (visible && !this.isVisible) {
      this.show();
    } else if (!visible && this.isVisible) {
      this.hide();
    }
  });
}
