// Import the ICONS object
import { ICONS } from '../../utils';
import { TTS_PROVIDER, DEFAULT_MODEL_ID, DEFAULT_SPEECHIFY_MODEL_ID } from '../../../config';

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
      playButton.innerHTML = ICONS.audioWave;
      playButton.classList.add('loading');
    }
    
    // Use the appropriate model ID based on the TTS provider
    const modelId = TTS_PROVIDER === 'elevenlabs' ? DEFAULT_MODEL_ID : DEFAULT_SPEECHIFY_MODEL_ID;
    
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
          playButton.innerHTML = ICONS.play;
          playButton.classList.remove('loading');
        }
      };
      
      audio.play();
    } else {
      console.error('Failed to get audio sample');
      if (playButton) {
        playButton.innerHTML = ICONS.play;
        playButton.classList.remove('loading');
      }
    }
  } catch (error) {
    console.error('Error playing sample:', error);
    // Reset button if there's an error
    const playButton = document.querySelector(`[data-voice-id="${voiceId}"] .voice-play-button`);
    if (playButton) {
      playButton.innerHTML = ICONS.play;
      playButton.classList.remove('loading');
    }
  }
}
