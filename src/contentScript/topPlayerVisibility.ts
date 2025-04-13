// Add this code to the TopPlayer.ts file as new methods

// Add this to the constructor
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

// Add this new method to listen for visibility events
private setupVisibilityListener(): void {
  document.addEventListener('update-top-player-visibility', (event: any) => {
    const { visible } = event.detail;
    console.log(`📖 [TopPlayer] Visibility update received: ${visible ? 'show' : 'hide'}`);
    
    if (visible && !this.isVisible) {
      this.show();
    } else if (!visible) {
      this.remove(); // Use remove instead of hide to fully remove it from DOM
    }
  });
}

// Add this new method to check initial visibility setting
private checkInitialVisibility(): void {
  chrome.storage.local.get(['topPlayerEnabled'], (result) => {
    // Default to true if setting doesn't exist
    const isVisible = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
    console.log(`📖 [TopPlayer] Initial visibility from storage: ${isVisible ? 'visible' : 'hidden'}`);
    
    if (!isVisible && this.playerElement) {
      // If player exists but should be hidden, remove it
      this.remove();
    }
  });
}

// Replace the existing hide method with this improved version
public hide(): void {
  console.log('📖 [TopPlayer] Hiding top player');
  
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

// Update the public show method
public show(): void {
  console.log('📖 [TopPlayer] Showing top player');
  
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

// Replace the existing toggle method
public toggle(): void {
  chrome.storage.local.get(['topPlayerEnabled'], (result) => {
    // Default to true if setting doesn't exist
    const currentVisibility = result.topPlayerEnabled !== undefined ? result.topPlayerEnabled : true;
    const newVisibility = !currentVisibility;
    
    // Save new setting
    chrome.storage.local.set({ topPlayerEnabled: newVisibility }, () => {
      console.log(`📖 [TopPlayer] Visibility toggled to: ${newVisibility ? 'visible' : 'hidden'}`);
      
      // Update visibility
      if (newVisibility) {
        this.show();
      } else {
        this.remove();
      }
    });
  });
}
