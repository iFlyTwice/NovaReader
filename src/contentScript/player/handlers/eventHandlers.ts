/**
 * Event handlers for the side player
 */

import { dispatchSelectionButtonStateEvent } from '../utils/playerEvents';
import { SidePlayer } from '../SidePlayer';

// Setup the selection playback listener
export function setupSelectionPlaybackListener(player: SidePlayer): void {
  // Remove any existing listener first to prevent duplicates
  document.removeEventListener('selection-playback', player.handleSelectionPlaybackEvent);
  
  // Add the event listener
  document.addEventListener('selection-playback', player.handleSelectionPlaybackEvent);
  
  console.log('[SidePlayer] Selection playback listener set up');
}

// Setup listener to ensure player is visible before playback
export function setupEnsurePlayerVisibleListener(player: SidePlayer): void {
  document.addEventListener('ensure-player-visible', (event: any) => {
    const { text } = event.detail;
    console.log('📱 [Player] Ensuring visibility');
    
    // If player isn't visible, create it
    if (!document.getElementById(player.playerId)) {
      player.create();
      console.log('📱 [Player] Created new player instance');
    }
    
    // Store the text so it can be played
    if (text) {
      player.currentText = text;
      console.log('📱 [Player] Text stored: ', 
                  text.length > 20 ? `${text.substring(0, 20)}...` : text);
    }
  });
}
