/**
 * Playback event handlers for the side player
 */

import { ICONS } from '../../utils';
import { dispatchSelectionButtonStateEvent } from '../utils/playerEvents';

// Handle playback start event
export function handlePlaybackStart(playButton: HTMLElement | null): void {
  if (playButton) {
    // Add active class
    playButton.classList.add('active');
    
    // Change icon to pause
    playButton.innerHTML = ICONS.pause;
  }
  
  // Dispatch event to update selection button state
  dispatchSelectionButtonStateEvent('speaking');
}

// Handle playback end event
export function handlePlaybackEnd(playButton: HTMLElement | null): void {
  if (playButton) {
    // Remove active class
    playButton.classList.remove('active');
    
    // Change icon back to play
    playButton.innerHTML = ICONS.play;
  }
  
  // Dispatch event to update selection button state
  dispatchSelectionButtonStateEvent('play');
}

// Handle playback pause event
export function handlePlaybackPause(playButton: HTMLElement | null): void {
  if (playButton) {
    // Remove active class
    playButton.classList.remove('active');
    
    // Change icon back to play
    playButton.innerHTML = ICONS.play;
  }
  
  // Dispatch event to update selection button state
  dispatchSelectionButtonStateEvent('play');
  
  console.log('📱 [Player] Paused state active');
}

// Handle playback error event
export function handlePlaybackError(error: string, playButton: HTMLElement | null): void {
  console.error('Playback error:', error);
  
  // Reset button state
  if (playButton) {
    // Remove active class
    playButton.classList.remove('active');
    
    // Change icon back to play
    playButton.innerHTML = ICONS.play;
  }
  
  // Dispatch event to update selection button state
  dispatchSelectionButtonStateEvent('play');
}

// Update the time display
export function updateTimeDisplay(
  timeDisplay: HTMLElement | null, 
  currentTime: number, 
  duration: number
): void {
  if (timeDisplay) {
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    
    // If duration is known, finite, and not NaN, show time as current/total
    if (duration && isFinite(duration) && !isNaN(duration)) {
      const totalMinutes = Math.floor(duration / 60);
      const totalSeconds = Math.floor(duration % 60);
      timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}/${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
    } else {
      // Otherwise just show current time without the infinity symbol
      timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
}
