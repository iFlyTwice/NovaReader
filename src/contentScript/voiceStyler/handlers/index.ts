/**
 * Handlers for the Voice Styler component
 */

import { STORAGE_KEYS } from '../config';

/**
 * Get the current style from storage
 */
export const getCurrentStyle = async (): Promise<{ emotion: string | null, cadence: string | null }> => {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.VOICE_EMOTION, STORAGE_KEYS.VOICE_CADENCE], (result) => {
      resolve({
        emotion: result[STORAGE_KEYS.VOICE_EMOTION] || null,
        cadence: result[STORAGE_KEYS.VOICE_CADENCE] || null
      });
    });
  });
};

/**
 * Save the current style to storage
 */
export const saveStyleToStorage = (emotion: string | null, cadence: string | null): void => {
  // Create storage object
  const storageObj: Record<string, string | null> = {};
  
  // Set emotion if provided
  if (emotion !== null) {
    storageObj[STORAGE_KEYS.VOICE_EMOTION] = emotion;
  } else {
    // If null, we still need to save it to override any existing value
    storageObj[STORAGE_KEYS.VOICE_EMOTION] = null;
  }
  
  // Set cadence if provided
  if (cadence !== null) {
    storageObj[STORAGE_KEYS.VOICE_CADENCE] = cadence;
  } else {
    // If null, we still need to save it to override any existing value
    storageObj[STORAGE_KEYS.VOICE_CADENCE] = null;
  }
  
  // Save to storage
  chrome.storage.local.set(storageObj, () => {
    console.log('[VoiceStyler] Style saved to storage:', { emotion, cadence });
  });
  
  // Dispatch style change event for other components to listen to
  dispatchStyleChangeEvent(emotion, cadence);
};

/**
 * Dispatch style change event
 */
export const dispatchStyleChangeEvent = (emotion: string | null, cadence: string | null): void => {
  const event = new CustomEvent('voice-style-change', {
    detail: { emotion, cadence }
  });
  document.dispatchEvent(event);
  
  console.log('[VoiceStyler] Style change event dispatched:', { emotion, cadence });
};

/**
 * Handle emotion selection
 */
export const handleEmotionSelect = (emotion: string | null): void => {
  console.log('[VoiceStyler] Emotion selected:', emotion);
  
  // Here you could add any additional logic needed when an emotion is selected
  // For example, playing a sample with this emotion
};

/**
 * Handle cadence selection
 */
export const handleCadenceSelect = (cadence: string | null): void => {
  console.log('[VoiceStyler] Cadence selected:', cadence);
  
  // Here you could add any additional logic needed when a cadence is selected
  // For example, checking if the current model supports cadence
};
