// Import the ICONS object
import { ICONS } from '../../utils';
import { DEFAULT_SPEECHIFY_MODEL_ID } from '../../../config';
import { createLogger } from '../../../utils/logger';

// Create a logger instance for this module
const logger = createLogger('VoiceSampleHandler');

// Keep track of timeouts for each button
const resetTimeouts: { [key: string]: ReturnType<typeof setTimeout> } = {};

/**
 * Set the state of a play button
 * @param playButton The play button element
 * @param voiceId The voice ID
 * @param state The state to set ('play' | 'loading' | 'speaking')
 */
function setPlayButtonState(playButton: Element, voiceId: string, state: 'play' | 'loading' | 'speaking'): void {
  logger.info(`Setting state for voice ${voiceId}: ${state}`);
  
  // Clear any existing timeout for this button
  if (resetTimeouts[voiceId]) {
    clearTimeout(resetTimeouts[voiceId]);
    delete resetTimeouts[voiceId];
  }
  
  try {
    switch (state) {
      case 'play':
        playButton.innerHTML = ICONS.play;
        playButton.classList.remove('loading');
        break;
      case 'loading':
        playButton.innerHTML = ICONS.loading;
        playButton.classList.add('loading');
        // Set a timeout to reset to play state if stuck loading for too long
        resetTimeouts[voiceId] = setTimeout(() => {
          logger.warn(`Voice ${voiceId} stuck in loading state for 8 seconds, auto-resetting`);
          setPlayButtonState(playButton, voiceId, 'play');
          showTooltip(playButton, 'Error loading audio. Please try again.');
        }, 8000); // 8 seconds timeout - faster feedback
        break;
      case 'speaking':
        playButton.innerHTML = ICONS.pause;
        playButton.classList.remove('loading');
        break;
    }
  } catch (error) {
    logger.error(`Error setting button state: ${error}`);
    // Attempt to reset to a safe state
    try {
      playButton.innerHTML = ICONS.play;
      playButton.classList.remove('loading');
    } catch (fallbackError) {
      logger.error(`Failed to set fallback icon: ${fallbackError}`);
    }
  }
}

/**
 * Show tooltip with message
 */
function showTooltip(element: Element, message: string): void {
  // Create tooltip if doesn't exist
  let tooltip = document.getElementById('voice-selector-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'voice-selector-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.zIndex = '10000';
    tooltip.style.pointerEvents = 'none';
    document.body.appendChild(tooltip);
  }
  
  // Position near play button
  const buttonRect = element.getBoundingClientRect();
  tooltip.style.top = `${window.scrollY + buttonRect.bottom + 5}px`;
  tooltip.style.left = `${window.scrollX + buttonRect.left}px`;
  
  // Set message and show
  tooltip.textContent = message;
  tooltip.style.display = 'block';
  
  // Hide after delay
  setTimeout(() => {
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }, 3000);
}

/**
 * Plays a sample of the selected voice
 * @param voiceId The ID of the voice to play
 * @param voiceName The name of the voice to play
 */
export async function playSample(voiceId: string, voiceName: string): Promise<void> {
  try {
    // Import the textToSpeech function only when needed to avoid circular dependencies
    const { textToSpeech } = await import('../../speechifyApi');
    
    const sampleText = "Hello! This is a sample of my voice.";
    
    // Change button to loading state
    const playButton = document.querySelector(`[data-voice-id="${voiceId}"] .voice-play-button`);
    if (playButton) {
      setPlayButtonState(playButton, voiceId, 'loading');
    }
    
    // Use the Speechify model ID
    const modelId = DEFAULT_SPEECHIFY_MODEL_ID;
    
    const audioData = await textToSpeech(sampleText, voiceId, modelId);
    
    if (audioData) {
      // Create blob from audio data
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      // Create and play audio
      const audio = new Audio(url);
      audio.onended = () => {
        // Clean up URL and reset button when audio ends
        URL.revokeObjectURL(url);
        if (playButton) {
          setPlayButtonState(playButton, voiceId, 'play');
        }
      };
      
      audio.play();
      if (playButton) {
        setPlayButtonState(playButton, voiceId, 'speaking');
      }
    } else {
      logger.error('Failed to get audio sample');
      if (playButton) {
        setPlayButtonState(playButton, voiceId, 'play');
      }
    }
  } catch (error) {
    logger.error('Error playing sample:', error);
    // Reset button if there's an error
    const playButton = document.querySelector(`[data-voice-id="${voiceId}"] .voice-play-button`);
    if (playButton) {
      setPlayButtonState(playButton, voiceId, 'play');
    }
  }
}
