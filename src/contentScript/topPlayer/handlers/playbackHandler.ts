/**
 * Playback handlers for the top player
 */

export function handlePlaybackStart(topPlayer: any): void {
  console.log('[TopPlayer] Playback started');
  topPlayer.isPlaying = true;
  topPlayer.setState('speaking');
}

export function handlePlaybackEnd(topPlayer: any): void {
  console.log('[TopPlayer] Playback ended');
  topPlayer.isPlaying = false;
  topPlayer.setState('play');
  topPlayer.pauseProgressAnimation();
}

export function handlePlaybackError(topPlayer: any, error: string): void {
  console.error('[TopPlayer] Playback error:', error);
  topPlayer.isPlaying = false;
  topPlayer.setState('play');
  topPlayer.pauseProgressAnimation();
  
  // Check if player is still in the DOM before showing notification
  if (!document.getElementById(topPlayer.playerId)) {
    console.log('[TopPlayer] Player removed from DOM, skipping error notification');
    return;
  }
  
  // Check for common error types and display appropriate messages
  if (error.includes('quota') || error.includes('credits')) {
    // Show a quota error notification
    showErrorNotification('ElevenLabs API quota exceeded. Please upgrade your ElevenLabs account or try a shorter text.');
  } else if (error.includes('Unauthorized')) {
    // Show an authentication error notification
    showErrorNotification('API key error. Please check your ElevenLabs API key in the extension settings.');
  } else if (error.includes('timeout')) {
    // Show a timeout error notification
    showErrorNotification('Playback timed out. Trying with a shorter text segment...');
  } else {
    // Generic error
    showErrorNotification('Playback error. Please try again with a shorter text or refresh the page.');
  }
}

export function updateTimeDisplay(topPlayer: any, currentTime: number, duration: number): void {
  if (!duration || isNaN(duration)) return;
  
  // Check if player is still in the DOM before updating
  if (!topPlayer.playerElement || !document.getElementById(topPlayer.playerId)) {
    console.log('[TopPlayer] Player removed from DOM, skipping time update');
    return;
  }
  
  // Calculate playback progress percentage
  const progressPercentage = (currentTime / duration) * 100;
  
  // Update progress bar
  if (topPlayer.playerElement) {
    const progressBar = topPlayer.playerElement.querySelector('#top-player-progress') as HTMLElement;
    if (progressBar) {
      progressBar.style.width = `${progressPercentage}%`;
    }
  }
}

export function showErrorNotification(message: string): void {
  // Check if notification already exists and remove it
  const existingNotification = document.querySelector('.top-player-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'top-player-notification';
  notification.textContent = message;
  
  // Style the notification
  notification.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
  notification.style.color = 'white';
  notification.style.padding = '10px 15px';
  notification.style.borderRadius = '4px';
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '10000';
  notification.style.maxWidth = '300px';
  notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  notification.style.fontSize = '14px';
  
  // Add close button
  const closeButton = document.createElement('span');
  closeButton.textContent = '×';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '10px';
  closeButton.style.fontSize = '18px';
  closeButton.style.cursor = 'pointer';
  closeButton.onclick = () => notification.remove();
  
  notification.appendChild(closeButton);
  
  // Add to document
  document.body.appendChild(notification);
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.remove();
    }
  }, 8000);
}