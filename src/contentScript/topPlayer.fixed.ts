// This function sets up the event handlers for the top player UI
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
        buttonElement: settingsButton,
        onSettingsClick: () => {
          console.log('📖 [TopPlayer] Settings clicked');
          // You would typically open settings here
        },
        onHidePlayerClick: () => {
          console.log('📖 [TopPlayer] Hide player clicked');
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
  
  // Playback speed
  const playbackSpeed = this.playerElement.querySelector('.top-player-playback-speed');
  if (playbackSpeed) {
    playbackSpeed.addEventListener('click', () => {
      // Simple speed cycle: 1x -> 1.5x -> 2x -> 0.5x -> 0.75x -> 1x
      const speedText = playbackSpeed.querySelector('.top-player-playback-speed-text');
      if (speedText) {
        const currentSpeed = speedText.textContent || '1x';
        let newSpeed = '1x';
        
        switch (currentSpeed) {
          case '1x': newSpeed = '1.5x'; break;
          case '1.5x': newSpeed = '2x'; break;
          case '2x': newSpeed = '0.5x'; break;
          case '0.5x': newSpeed = '0.75x'; break;
          case '0.75x': newSpeed = '1x'; break;
          default: newSpeed = '1x';
        }
        
        speedText.textContent = newSpeed;
        console.log('📖 [TopPlayer] Playback speed changed to', newSpeed);
        
        // Extract numeric value from speed text
        const speedValue = parseFloat(newSpeed);
        if (!isNaN(speedValue)) {
          this.audioPlayer.setPlaybackSpeed(speedValue);
        }
      }
    });
  }
}

/**
 * Hide the player from view
 */
public hide(): void {
  if (!this.playerElement) return;
  
  console.log('📖 [TopPlayer] Hiding player');
  
  // First add a fade-out animation
  this.playerElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  this.playerElement.style.opacity = '0';
  this.playerElement.style.transform = 'translateY(-20px)';
  
  // After animation completes, hide the element
  setTimeout(() => {
    if (this.playerElement) {
      this.playerElement.style.display = 'none';
      this.isVisible = false;
      
      // Store the hidden state in local storage
      try {
        chrome.storage.local.set({ topPlayerHidden: true });
      } catch (error) {
        console.error('📖 [TopPlayer] Error saving hidden state:', error);
      }
      
      // Dispatch an event that other components can listen for
      const event = new CustomEvent('top-player-hidden');
      document.dispatchEvent(event);
    }
  }, 300);
}

/**
 * Show the player if it was hidden
 */
public show(): void {
  if (!this.playerElement) {
    this.create();
  } else {
    console.log('📖 [TopPlayer] Showing player');
    
    // Reset styles
    this.playerElement.style.display = 'block';
    
    // Add a fade-in animation
    this.playerElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    this.playerElement.style.opacity = '0';
    this.playerElement.style.transform = 'translateY(-20px)';
    
    // Trigger reflow to ensure animation plays
    void this.playerElement.offsetWidth;
    
    // Fade in
    this.playerElement.style.opacity = '1';
    this.playerElement.style.transform = 'translateY(0)';
    
    this.isVisible = true;
    
    // Store the visible state in local storage
    try {
      chrome.storage.local.set({ topPlayerHidden: false });
    } catch (error) {
      console.error('📖 [TopPlayer] Error saving visible state:', error);
    }
    
    // Dispatch an event that other components can listen for
    const event = new CustomEvent('top-player-shown');
    document.dispatchEvent(event);
  }
}