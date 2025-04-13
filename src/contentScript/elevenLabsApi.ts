// ElevenLabs API integration for NovaReader

// Types for ElevenLabs API responses
interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
}

export interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
}

import { ELEVENLABS_API_KEY } from '../config';

// Get API key - prioritizing the one from config
const getApiKey = async (): Promise<string> => {
  // Always use the key from config file first (direct access)
  if (ELEVENLABS_API_KEY) {
    console.log('[ElevenLabsAPI] Using hardcoded API key from config file');
    
    // Also save it to storage for future use
    try {
      await saveApiKeyToStorage(ELEVENLABS_API_KEY);
    } catch (saveError) {
      console.error('[ElevenLabsAPI] Failed to save API key to storage (non-critical):', saveError);
    }
    
    return ELEVENLABS_API_KEY;
  }
  
  // Fallback to storage if config key is somehow not available
  try {
    const storageKey = await getApiKeyFromStorage();
    console.log('[ElevenLabsAPI] Using API key from storage');
    return storageKey;
  } catch (error) {
    console.error('[ElevenLabsAPI] Error: No API key available anywhere:', error);
    throw new Error('API key not available in config or storage');
  }
};

// Save API key to storage
export const saveApiKeyToStorage = async (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ apiKey }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Error saving API key: ${chrome.runtime.lastError.message}`));
      } else {
        resolve();
      }
    });
  });
};

// Fetch available voices from ElevenLabs API
export const fetchElevenLabsVoices = async (): Promise<Voice[]> => {
  try {
    const apiKey = await getApiKey();

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as ElevenLabsVoicesResponse;
    
    // Transform the ElevenLabs voice format to our app's format
    // We'll assign gender and accent based on voice name or category for now
    // In a real implementation, you might want to get this information from additional API calls
    // or from voice metadata
    const voices: Voice[] = data.voices.map(voice => {
      // Default values
      let gender = 'Unknown';
      let accent = 'Unknown';
      
      // Simple heuristic to determine gender based on common names
      // This is not reliable and should be replaced with actual metadata
      const maleNames = ['Adam', 'Antoni', 'Arnold', 'Clyde', 'Daniel', 'Dave', 'David', 'Drew', 'Ethan', 'Fin', 'Glinda', 'Harry', 'James', 'Jeremy', 'Josh', 'Matthew', 'Michael', 'Patrick', 'Paul', 'Sam', 'Thomas'];
      const femaleNames = ['Amala', 'Anna', 'Ashley', 'Charlotte', 'Domi', 'Dorothy', 'Ella', 'Emma', 'Elli', 'Emily', 'Freeman', 'Gigi', 'Grace', 'Isabella', 'Jessie', 'Joanne', 'Lily', 'Madison', 'Nicole', 'Rachel', 'Sarah', 'Serena', 'Sofia'];
      
      if (maleNames.some(name => voice.name.includes(name))) {
        gender = 'Male';
      } else if (femaleNames.some(name => voice.name.includes(name))) {
        gender = 'Female';
      }
      
      // Simplistic accent detection based on voice name
      const accentMap: Record<string, string> = {
        'American': 'American',
        'British': 'British',
        'Australian': 'Australian',
        'Indian': 'Indian',
        'German': 'German',
        'French': 'French',
        'Italian': 'Italian',
        'Japanese': 'Japanese',
        'Spanish': 'Spanish',
      };
      
      // Check if any accent keyword is in the voice name
      for (const [keyword, accentValue] of Object.entries(accentMap)) {
        if (voice.name.includes(keyword)) {
          accent = accentValue;
          break;
        }
      }
      
      return {
        id: voice.voice_id,
        name: voice.name,
        gender,
        accent,
      };
    });
    
    return voices;
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    return [];
  }
};

// Convert text to speech using ElevenLabs API
export const textToSpeech = async (text: string, voiceId: string, modelId: string = 'eleven_turbo_v2'): Promise<ArrayBuffer | null> => {
  try {
    const apiKey = await getApiKey();

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          similarity_boost: 0.5,
          stability: 0.5,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error converting text to speech:', error);
    return null;
  }
};

// Stream text to speech using ElevenLabs API
export const streamTextToSpeech = async (text: string, voiceId: string, modelId: string = 'eleven_turbo_v2'): Promise<ReadableStream<Uint8Array> | null> => {
  try {
    console.log('[ElevenLabsAPI] Starting TTS request for text of length:', text.length);
    console.log('[ElevenLabsAPI] Using voice ID:', voiceId);
    
    if (!voiceId || voiceId === 'undefined') {
      console.error('[ElevenLabsAPI] Invalid voice ID provided');
      throw new Error('Invalid voice ID provided. Please select a valid voice.');
    }
    
    // Get API Key
    let apiKey;
    try {
      apiKey = await getApiKey();
      
      // Basic validation - make sure we have something that looks like an API key
      if (!apiKey || apiKey.length < 10) {
        throw new Error('Invalid API key format');
      }
      
      console.log('[ElevenLabsAPI] API key retrieved successfully');
    } catch (keyError) {
      console.error('[ElevenLabsAPI] API key error:', keyError);
      throw new Error(`API key error: ${keyError.message}`);
    }

    console.log(`[ElevenLabsAPI] Making request to ElevenLabs API - Voice ID: ${voiceId}, Model: ${modelId}`);
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          similarity_boost: 0.5,
          stability: 0.5,
        },
      }),
    });

    console.log('[ElevenLabsAPI] Response received:', {
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      // Check for specific error types
      if (response.status === 401) {
        let errorMessage = 'Unauthorized. Check your API key.';
        try {
          const errorBody = await response.json();
          console.log('[ElevenLabsAPI] 401 error details:', errorBody);
          
          // Check if this is a quota or unusual activity issue
          if (errorBody.detail) {
            // Handle both object and string detail formats
            if (typeof errorBody.detail === 'string') {
              // Direct message format
              errorMessage = `ElevenLabs API Error: ${errorBody.detail}`;
              
              // Extract credit information if available
              const creditMatch = errorBody.detail.match(/(\d+) credits remaining.+(\d+) credits are required/);
              if (creditMatch && creditMatch.length >= 3) {
                const creditsRemaining = creditMatch[1];
                const creditsRequired = creditMatch[2];
                errorMessage = `ElevenLabs API Error: This request exceeds your quota. You have ${creditsRemaining} credits remaining, while ${creditsRequired} credits are required for this request.`;
              }
            } 
            // Object format with status field
            else if (errorBody.detail.status) {
              const errorStatus = errorBody.detail.status;
              if (errorStatus === "detected_unusual_activity" || errorStatus === "quota_exceeded") {
                errorMessage = `ElevenLabs API Error: ${errorBody.detail.message}`;
              }
            }
          }
        } catch (jsonError) {
          console.error('[ElevenLabsAPI] Error parsing error response:', jsonError);
        }
        throw new Error(errorMessage);
      }
      
      throw new Error(`HTTP error! status: ${response.status}, text: ${response.statusText}`);
    }

    if (!response.body) {
      console.error('[ElevenLabsAPI] Response body is null despite 200 status');
      throw new Error('Response body is null');
    }

    console.log('[ElevenLabsAPI] Successfully received stream response');
    return response.body;
  } catch (error) {
    console.error('[ElevenLabsAPI] Error streaming text to speech:', error);
    throw error; // Re-throw so caller can handle it
  }
};

// Get API key from Chrome storage instead of environment variables
// This is more practical for a Chrome extension
export const getApiKeyFromStorage = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['apiKey'], function(result) {
      const apiKey = result.apiKey;
      if (!apiKey) {
        reject(new Error('API key not found in storage'));
      } else {
        resolve(apiKey);
      }
    });
  });
};