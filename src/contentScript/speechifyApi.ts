// Speechify API integration for NovaReader

// Types for Speechify API responses
interface SpeechifyVoice {
  id: string;
  name: string;
  gender?: string;
  language?: string;
  model?: string;
}

interface SpeechifyVoicesResponse {
  voices: SpeechifyVoice[];
}

export interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
}

import { SPEECHIFY_API_KEY } from '../config';

// Get API key - prioritizing the one from config
const getApiKey = async (): Promise<string> => {
  // Always use the key from config file first (direct access)
  if (SPEECHIFY_API_KEY) {
    console.log('[SpeechifyAPI] Using hardcoded API key from config file');
    
    // Also save it to storage for future use
    try {
      await saveApiKeyToStorage(SPEECHIFY_API_KEY);
    } catch (saveError) {
      console.error('[SpeechifyAPI] Failed to save API key to storage (non-critical):', saveError);
    }
    
    return SPEECHIFY_API_KEY;
  }
  
  // Fallback to storage if config key is somehow not available
  try {
    const storageKey = await getApiKeyFromStorage();
    console.log('[SpeechifyAPI] Using API key from storage');
    return storageKey;
  } catch (error) {
    console.error('[SpeechifyAPI] Error: No API key available anywhere:', error);
    throw new Error('API key not available in config or storage');
  }
};

// Save API key to storage
export const saveApiKeyToStorage = async (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ speechifyApiKey: apiKey }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Error saving Speechify API key: ${chrome.runtime.lastError.message}`));
      } else {
        resolve();
      }
    });
  });
};

// Get access token using API key (OAuth 2.0 Client Credentials flow)
export const getAccessToken = async (scope: string = 'audio:all voices:read'): Promise<string> => {
  try {
    const apiKey = await getApiKey();
    
    const response = await fetch('https://api.sws.speechify.com/v1/auth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=client_credentials&scope=${scope}`
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('[SpeechifyAPI] Error getting access token:', error);
    throw error;
  }
};

// Fetch available voices from Speechify API
export const fetchVoices = async (): Promise<Voice[]> => {
  try {
    const apiKey = await getApiKey();

    // Use direct API key authentication instead of access token
    const response = await fetch('https://api.sws.speechify.com/v1/voices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if the response has the expected structure
    // According to the documentation, the response is an array of voice objects
    if (!data || !Array.isArray(data)) {
      console.error('[SpeechifyAPI] Unexpected response format:', data);
      return [];
    }
    
    console.log('[SpeechifyAPI] Received voices:', data.length);
    
    // Transform the Speechify voice format to our app's format
    const voices: Voice[] = data.map((voice: any) => {
      return {
        id: voice.id || 'unknown-id',
        name: voice.display_name || voice.id || 'Unknown Voice',
        gender: voice.gender || 'Unknown',
        accent: voice.locale || 'Unknown',
      };
    });
    
    return voices;
  } catch (error) {
    console.error('[SpeechifyAPI] Error fetching Speechify voices:', error);
    return [];
  }
};

// Convert text to speech using Speechify API
export const textToSpeech = async (text: string, voiceId: string, modelId: string = 'simba-english'): Promise<ArrayBuffer | null> => {
  try {
    const apiKey = await getApiKey();

    console.log('[SpeechifyAPI] Making TTS request with:', {
      text: text.substring(0, 20) + '...',
      voiceId,
      modelId
    });

    // For testing with placeholder voice IDs, use a default voice
    // This is needed because the placeholder voice IDs we added won't work with the real API
    const actualVoiceId = voiceId.includes('speechify-voice') ? 'default' : voiceId;

    // Direct API key authentication instead of access token
    const response = await fetch('https://api.sws.speechify.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text, // Using 'input' as per the official documentation
        voice_id: actualVoiceId, // Using 'voice_id' as per the official documentation
        model: modelId,
        audio_format: 'mp3' // Using 'audio_format' as per the official documentation
      }),
    });

    if (!response.ok) {
      // Try to get more details about the error
      try {
        const errorData = await response.json();
        console.error('[SpeechifyAPI] Error details:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
      } catch (jsonError) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    // The response includes both audio data and speech marks
    const data = await response.json();
    
    // Check if the response has the expected structure
    // According to the documentation, the response has an audio_data property
    if (!data || !data.audio_data) {
      console.error('[SpeechifyAPI] Unexpected response format:', data);
      throw new Error('Unexpected response format from Speechify API');
    }
    
    console.log('[SpeechifyAPI] Successfully received audio data');
    
    // Convert base64 audio to ArrayBuffer
    const audioBase64 = data.audio_data;
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  } catch (error) {
    console.error('[SpeechifyAPI] Error converting text to speech:', error);
    return null;
  }
};

// Stream text to speech using Speechify API
export const streamTextToSpeech = async (text: string, voiceId: string, modelId: string = 'simba-english'): Promise<ReadableStream<Uint8Array> | null> => {
  try {
    console.log('[SpeechifyAPI] Starting TTS request for text of length:', text.length);
    console.log('[SpeechifyAPI] Using voice ID:', voiceId);
    
    if (!voiceId || voiceId === 'undefined') {
      console.error('[SpeechifyAPI] Invalid voice ID provided');
      throw new Error('Invalid voice ID provided. Please select a valid voice.');
    }
    
    // Get API key directly
    let apiKey;
    try {
      apiKey = await getApiKey();
      
      // Basic validation
      if (!apiKey || apiKey.length < 10) {
        throw new Error('Invalid API key format');
      }
      
      console.log('[SpeechifyAPI] API key retrieved successfully');
    } catch (keyError) {
      console.error('[SpeechifyAPI] API key error:', keyError);
      throw new Error(`API key error: ${(keyError as any).message}`);
    }

    // For testing with placeholder voice IDs, use a default voice
    const actualVoiceId = voiceId.includes('speechify-voice') ? 'default' : voiceId;

    console.log(`[SpeechifyAPI] Making request to Speechify API - Voice ID: ${actualVoiceId}, Model: ${modelId}`);
    const response = await fetch('https://api.sws.speechify.com/v1/audio/stream', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text, // Using 'input' as per the official documentation
        voice_id: actualVoiceId, // Using 'voice_id' as per the official documentation
        model: modelId
      }),
    });

    console.log('[SpeechifyAPI] Response received:', {
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      // Check for specific error types
      if (response.status === 401) {
        let errorMessage = 'Unauthorized. Check your API key.';
        try {
          const errorBody = await response.json();
          console.log('[SpeechifyAPI] 401 error details:', errorBody);
          errorMessage = `Speechify API Error: ${JSON.stringify(errorBody)}`;
        } catch (jsonError) {
          console.error('[SpeechifyAPI] Error parsing error response:', jsonError);
        }
        throw new Error(errorMessage);
      }
      
      throw new Error(`HTTP error! status: ${response.status}, text: ${response.statusText}`);
    }

    if (!response.body) {
      console.error('[SpeechifyAPI] Response body is null despite 200 status');
      throw new Error('Response body is null');
    }

    console.log('[SpeechifyAPI] Successfully received stream response');
    return response.body;
  } catch (error) {
    console.error('[SpeechifyAPI] Error streaming text to speech:', error);
    throw error; // Re-throw so caller can handle it
  }
};

// Get API key from Chrome storage instead of environment variables
// This is more practical for a Chrome extension
export const getApiKeyFromStorage = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['speechifyApiKey'], function(result) {
      const apiKey = result.speechifyApiKey;
      if (!apiKey) {
        reject(new Error('Speechify API key not found in storage'));
      } else {
        resolve(apiKey);
      }
    });
  });
};
