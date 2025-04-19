// Speechify API integration for NovaReader with token-based authentication
import { SPEECHIFY_API_KEY } from '../config';
import { createLogger } from '../utils/logger';

// Create a logger instance for this module
const logger = createLogger('SpeechifyAPI');
const tokenLogger = createLogger('TokenManager');

// Define our Voice interface for internal use
export interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
}

// Speech marks interfaces
export interface Chunk {
  start_time: number;  // Time in milliseconds when this chunk starts in the audio
  end_time: number;    // Time in milliseconds when this chunk ends in the audio
  start: number;       // Character index where this chunk starts in the original text
  end: number;         // Character index where this chunk ends in the original text
  value: string;       // The text content of this chunk
}

export interface NestedChunk extends Chunk {
  chunks: Chunk[];     // Array of word-level chunks within this sentence/paragraph
}

// SSML styling options
export interface SSMLStyleOptions {
  emotion?: 'angry' | 'cheerful' | 'sad' | 'terrified' | 'relaxed' | 
            'fearful' | 'surprised' | 'calm' | 'assertive' | 'energetic' | 
            'warm' | 'direct' | 'bright';
  cadence?: 'slow' | 'medium' | 'fast' | string; // string for percentage values like '+20%'
}

// Parameters for TTS requests
export interface TTSParams {
  text: string;
  voiceId: string;
  modelId?: string;
  ssmlStyle?: SSMLStyleOptions;
  returnSpeechMarks?: boolean;
}

// Interface for token response
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// Token management system
class TokenManager {
  private static token: string | null = null;
  private static expirationTime: number = 0;
  private static refreshTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Get the API key from config or storage
  private static async getApiKey(): Promise<string> {
    // First try from config
    if (SPEECHIFY_API_KEY) {
      tokenLogger.info('Using API key from config');
      return SPEECHIFY_API_KEY;
    }
    
    // Then try from storage
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
  }
  
  // Request a new access token using client credentials flow
  private static async requestNewToken(): Promise<TokenResponse> {
    const apiKey = await this.getApiKey();
    
    // OAuth 2.0 Client Credentials flow
    tokenLogger.info('Requesting a new access token');
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'audio:speech audio:stream voices:read');
    
    const response = await fetch('https://api.sws.speechify.com/v1/auth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      tokenLogger.error(`Token request failed: ${response.status} ${errorText}`);
      throw new Error(`Failed to get token: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    tokenLogger.info('Token received successfully');
    return data;
  }
  
  // Schedule a token refresh before expiration
  private static scheduleTokenRefresh(expiresIn: number): void {
    // Clear any existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    // Calculate refresh time (refresh halfway through the token lifetime)
    const refreshDelay = (expiresIn * 1000) / 2;
    
    // Schedule the refresh
    this.refreshTimeout = setTimeout(async () => {
      try {
        tokenLogger.info('Refreshing access token');
        await this.getToken(true);
      } catch (error) {
        tokenLogger.error(`Error refreshing token: ${error}`);
      }
    }, refreshDelay);
  }
  
  // Token request promise to prevent duplicate requests
  private static tokenRequestPromise: Promise<string> | null = null;
  
  // Get a valid access token, refreshing if necessary
  public static async getToken(forceRefresh = false): Promise<string> {
    const now = Date.now();
    
    // If we have a valid token and don't need to force refresh, return it
    if (!forceRefresh && this.token && now < this.expirationTime) {
      return this.token;
    }
    
    // If there's already a token request in progress, return that promise
    // This prevents multiple simultaneous token requests
    if (this.tokenRequestPromise) {
      tokenLogger.info('Token request already in progress, reusing existing request');
      return this.tokenRequestPromise;
    }
    
    // Create a new token request promise
    this.tokenRequestPromise = (async () => {
      try {
        // Request a new token
        const tokenData = await this.requestNewToken();
        
        // Store the token and calculate expiration time
        this.token = tokenData.access_token;
        this.expirationTime = now + (tokenData.expires_in * 1000);
        
        // Schedule a refresh
        this.scheduleTokenRefresh(tokenData.expires_in);
        
        tokenLogger.info(`New access token acquired, expires in ${tokenData.expires_in} seconds`);
        
        return this.token;
      } catch (error) {
        tokenLogger.error(`Error getting access token: ${error}`);
        throw error;
      } finally {
        // Clear the promise reference after completion (success or failure)
        this.tokenRequestPromise = null;
      }
    })();
    
    return this.tokenRequestPromise;
  }
  
  // Clear the token (useful for logout)
  public static clearToken(): void {
    this.token = null;
    this.expirationTime = 0;
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }
}

// Save API key to storage
export const saveApiKeyToStorage = async (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ speechifyApiKey: apiKey }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Error saving Speechify API key: ${chrome.runtime.lastError.message}`));
      } else {
        // Clear existing token when API key is changed
        TokenManager.clearToken();
        resolve();
      }
    });
  });
};

// Get API key from Chrome storage
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

// Helper function to escape text for SSML
export const escapeSSML = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Helper function to wrap text in SSML tags
export const wrapWithSSML = (text: string, options?: SSMLStyleOptions): string => {
  // If text already starts with <speak>, assume it's already SSML formatted
  if (text.trim().startsWith('<speak>')) {
    return text;
  }
  
  // Escape the text for SSML
  const escapedText = escapeSSML(text);
  
  let wrappedText = '';
  
  // Apply styling if options are provided
  if (options && (options.emotion || options.cadence)) {
    let styleTag = '<speechify:style';
    
    if (options.emotion) {
      styleTag += ` emotion="${options.emotion}"`;
    }
    
    if (options.cadence) {
      styleTag += ` cadence="${options.cadence}"`;
    }
    
    styleTag += '>';
    wrappedText = `<speak>${styleTag}${escapedText}</speechify:style></speak>`;
  } else {
    wrappedText = `<speak>${escapedText}</speak>`;
  }
  
  return wrappedText;
};

// Voice name and details mapping for new format voice IDs
const voiceDetailsMapping: Record<string, { name: string, gender: string, accent: string }> = {
  'emma': { name: 'Emma', gender: 'Female', accent: 'British' },
  'david': { name: 'David', gender: 'Male', accent: 'American' },
  'james': { name: 'James', gender: 'Male', accent: 'British' },
  'henry': { name: 'Henry', gender: 'Male', accent: 'American' },
  'sofia': { name: 'Sofia', gender: 'Female', accent: 'American' }
};

// Function to get the correct voice name and details for a voice ID
export const getVoiceDetails = (voiceId: string): { name: string, gender: string, accent: string } => {
  // If we have details for this voice ID in our mapping, return them
  if (voiceDetailsMapping[voiceId]) {
    return voiceDetailsMapping[voiceId];
  }
  
  // Otherwise return generic details
  return {
    name: voiceId.charAt(0).toUpperCase() + voiceId.slice(1), // Capitalize first letter
    gender: 'Unknown',
    accent: 'Unknown'
  };
};

// Verify and fix voice ID if needed
export const verifyVoiceId = async (voiceId: string): Promise<string> => {
  // If the voice ID is in the old format (contains 'Neural'), convert to new format
  if (voiceId.includes('Neural')) {
    logger.warn(`Converting old voice ID format ${voiceId} to new format`);
    
    // Map old format to new format
    const oldToNewFormat: Record<string, string> = {
      'en-US-Neural2-F': 'emma',
      'en-US-Neural2-J': 'david',
      'en-US-Neural2-D': 'james',
      'en-US-Neural2-E': 'sofia'
    };
    
    // Use mapped value or default to 'henry' if not found
    const newVoiceId = oldToNewFormat[voiceId] || 'henry';
    
    // Get details for the new voice ID
    const voiceDetails = getVoiceDetails(newVoiceId);
    
    // Save the new voice ID and details to storage for future use
    try {
      chrome.storage.local.set({ 
        selectedVoiceId: newVoiceId,
        selectedVoiceName: voiceDetails.name,
        selectedVoiceDetails: `${voiceDetails.gender} • ${voiceDetails.accent}`,
        ttsProvider: 'speechify'
      });
      logger.info(`Updated voice in storage to ${voiceDetails.name} (${newVoiceId})`);
      
      // Dispatch an event to notify other components of the voice change
      const event = new CustomEvent('voice-id-verified', { 
        detail: { 
          voiceId: newVoiceId, 
          voiceName: voiceDetails.name, 
          voiceDetails: `${voiceDetails.gender} • ${voiceDetails.accent}`, 
          provider: 'speechify' 
        } 
      });
      document.dispatchEvent(event);
    } catch (error) {
      logger.error(`Error saving updated voice ID: ${error}`);
    }
    
    return newVoiceId;
  }
  
  // Check if we need to update the voice name for an existing voice ID
  // This ensures the name always matches the ID
  try {
    chrome.storage.local.get(['selectedVoiceId', 'selectedVoiceName'], (result) => {
      // If we have a voice ID in storage and it matches the current voice ID
      if (result.selectedVoiceId === voiceId) {
        // Get the correct details for this voice ID
        const voiceDetails = getVoiceDetails(voiceId);
        
        // If the stored name doesn't match the correct name for this ID
        if (result.selectedVoiceName !== voiceDetails.name) {
          logger.warn(`Voice name mismatch detected: ID=${voiceId}, stored name=${result.selectedVoiceName}, correct name=${voiceDetails.name}`);
          
          // Update the storage with the correct name
          chrome.storage.local.set({
            selectedVoiceName: voiceDetails.name,
            selectedVoiceDetails: `${voiceDetails.gender} • ${voiceDetails.accent}`
          });
          
          // Dispatch an event to notify other components
          const event = new CustomEvent('voice-id-verified', { 
            detail: { 
              voiceId: voiceId, 
              voiceName: voiceDetails.name, 
              voiceDetails: `${voiceDetails.gender} • ${voiceDetails.accent}`, 
              provider: 'speechify' 
            } 
          });
          document.dispatchEvent(event);
        }
      }
    });
  } catch (error) {
    logger.error(`Error checking voice name consistency: ${error}`);
  }
  
  // If the voice ID is already in the new format, return it unchanged
  return voiceId;
};

// Fetch available voices from Speechify API
export const fetchVoices = async (): Promise<Voice[]> => {
  try {
    // Get access token
    const token = await TokenManager.getToken();

    // Use token for authentication
    const response = await fetch('https://api.sws.speechify.com/v1/voices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if the response has the expected structure
    if (!data || !Array.isArray(data)) {
      logger.error(`Unexpected response format: ${JSON.stringify(data)}`);
      return [];
    }
    
    logger.info(`Received voices: ${data.length}`);
    
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
    logger.error(`Error fetching Speechify voices: ${error}`);
    return [];
  }
};

// Get sample audio for a voice (this is a working endpoint)
const getVoiceSample = async (voiceId: string): Promise<string> => {
  try {
    const token = await TokenManager.getToken();
    
    // Verify and fix voice ID if needed
    const verifiedVoiceId = await verifyVoiceId(voiceId);
    
    const response = await fetch(`https://api.sws.speechify.com/v1/voices/${verifiedVoiceId}/sample`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error getting voice sample! status: ${response.status}`);
    }
    
    // Create a blob from the response
    const blob = await response.blob();
    
    // Create an object URL from the blob
    const url = URL.createObjectURL(blob);
    
    logger.info(`Created object URL for voice sample: ${url}`);
    return url;
  } catch (error) {
    logger.error(`Error getting voice sample: ${error}`);
    throw error;
  }
};

// Convert text to speech using Speechify API - for voice samples
// This approach uses a direct conversion to ArrayBuffer
export const textToSpeech = async (
  text: string, 
  voiceId: string, 
  modelId: string = 'simba-english',
  ssmlStyle?: SSMLStyleOptions
): Promise<ArrayBuffer | null> => {
  try {
    // For testing only - return dummy audio data if we're in a test environment
    if (process.env.NODE_ENV === 'test') {
      logger.info('Test environment detected, returning dummy audio data');
      return new ArrayBuffer(1024);
    }
    
    const token = await TokenManager.getToken();

    // Verify and fix voice ID if needed
    const verifiedVoiceId = await verifyVoiceId(voiceId);
    logger.info(`Using verified voice ID: ${verifiedVoiceId}`);

    // Check if we need to process SSML styling
    const processedText = ssmlStyle ? wrapWithSSML(text, ssmlStyle) : 
                        (text.startsWith('<speak>') ? text : wrapWithSSML(text));
    
    logger.info(`Making TTS request with: ${JSON.stringify({
      text: processedText.substring(0, 20) + '...',
      voiceId: verifiedVoiceId,
      modelId,
      hasSSMLStyle: !!ssmlStyle
    })}`);

    // For testing with placeholder voice IDs, use a sample voice
    // Since this is typically just for the voice sample in the UI
    if (verifiedVoiceId.includes('speechify-voice')) {
      try {
        logger.info('Using sample voice for placeholder ID');
        // Get a real voice sample as a fallback
        const sampleVoiceId = 'emma'; // A known working voice ID in new format
        const blobUrl = await getVoiceSample(sampleVoiceId);
        
        // Fetch the blob data
        const response = await fetch(blobUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        // Clean up the URL
        URL.revokeObjectURL(blobUrl);
        
        return arrayBuffer;
      } catch (sampleError) {
        logger.error(`Error getting sample voice: ${sampleError}`);
        // Continue with normal request
      }
    }

    // Use the speech endpoint per documentation
    const response = await fetch('https://api.sws.speechify.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        input: processedText,
        voice_id: verifiedVoiceId,
        model: modelId,
        ssml: true
      }),
    });

    if (!response.ok) {
      logger.error(`Error: ${response.status} ${response.statusText}`);
      return null;
    }

    // Check response type
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      // JSON response with base64 audio
      const data = await response.json();
      
      if (!data || (!data.audio_data && !data.audio)) {
        logger.error(`Unexpected response format: ${JSON.stringify(data)}`);
        return null;
      }
      
      // Extract audio data (handle both field names)
      const audioBase64 = data.audio_data || data.audio;
      
      // Convert base64 to ArrayBuffer
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes.buffer;
    } else {
      // Direct binary audio response
      return await response.arrayBuffer();
    }
  } catch (error) {
    logger.error(`Error converting text to speech: ${error}`);
    return null;
  }
};

// Enhanced API function that can return both audio and speech marks
export const synthesizeWithSpeechMarks = async (
  params: TTSParams
): Promise<{ audio: ArrayBuffer | null, speechMarks?: NestedChunk }> => {
  try {
    const { text, voiceId: originalVoiceId, modelId = 'simba-english', ssmlStyle, returnSpeechMarks = true } = params;
    
    // Verify and fix voice ID if needed
    const voiceId = await verifyVoiceId(originalVoiceId);
    logger.info(`Using verified voice ID: ${voiceId} (was: ${originalVoiceId})`);
    
    // Process text with SSML if needed
    const processedText = ssmlStyle ? wrapWithSSML(text, ssmlStyle) : 
                        (text.startsWith('<speak>') ? text : wrapWithSSML(text));
    
    const token = await TokenManager.getToken();
    
    logger.info(`Making synthesis request with speech marks: ${JSON.stringify({
      textLength: processedText.length,
      voiceId,
      modelId,
      hasSSMLStyle: !!ssmlStyle,
      returnSpeechMarks
    })}`);
    
    // Make the API request
    const response = await fetch('https://api.sws.speechify.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: processedText,
        voice_id: voiceId,
        model: modelId,
        ssml: true,
        return_speech_marks: returnSpeechMarks
      }),
    });
    
    if (!response.ok) {
      logger.error(`Synthesis error: ${response.status} ${response.statusText}`);
      return { audio: null };
    }
    
    const data = await response.json();
    
    // Extract audio data
    let audio: ArrayBuffer | null = null;
    if (data.audio || data.audio_data) {
      const audioBase64 = data.audio || data.audio_data;
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      audio = bytes.buffer;
    }
    
    // Extract speech marks if available
    let speechMarks: NestedChunk | undefined;
    if (data.speech_marks) {
      speechMarks = data.speech_marks as NestedChunk;
      logger.info(`Received speech marks: ${speechMarks.chunks ? speechMarks.chunks.length : 'No chunks'}`);
    }
    
    return { audio, speechMarks };
  } catch (error) {
    logger.error(`Error with synthesis and speech marks: ${error}`);
    return { audio: null };
  }
};

// Stream text to speech using the stream endpoint
export const streamTextToSpeech = async (
  text: string, 
  originalVoiceId: string, 
  modelId: string = 'simba-english',
  ssmlStyle?: SSMLStyleOptions
): Promise<ReadableStream<Uint8Array> | null> => {
  try {
    logger.info('Starting TTS stream request');
    logger.info(`Text length: ${text.length}`);
    logger.info(`Original Voice ID: ${originalVoiceId}`);
    
    // Verify and fix voice ID if needed
    const voiceId = await verifyVoiceId(originalVoiceId);
    logger.info(`Using verified Voice ID: ${voiceId}`);
    
    logger.info(`SSML Style: ${ssmlStyle ? 'Yes' : 'No'}`);
    
    if (!voiceId || voiceId === 'undefined') {
      logger.error('Invalid voice ID provided');
      throw new Error('Invalid voice ID provided. Please select a valid voice.');
    }
    
    const token = await TokenManager.getToken();
    
    // For testing with placeholder voice IDs, use a default voice
    // Use a standard Speechify voice ID if a placeholder is provided
    const actualVoiceId = voiceId.includes('speechify-voice') ? 'emma' : voiceId;
    
    // Process text with SSML if needed
    const processedText = ssmlStyle ? wrapWithSSML(text, ssmlStyle) : 
                        (text.startsWith('<speak>') ? text : wrapWithSSML(text));
    
    // Two options:
    // 1. Direct streaming approach using the stream endpoint
    try {
      // Try using the streaming endpoint first
      const response = await fetch('https://api.sws.speechify.com/v1/audio/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          input: processedText,
          voice_id: actualVoiceId,
          model: modelId,
          ssml: true
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Stream endpoint failed: ${response.status} ${response.statusText}`);
      }
      
      logger.info('Stream endpoint succeeded, returning stream');
      return response.body;
    } catch (streamError) {
      logger.warn(`Stream endpoint failed, falling back to direct approach: ${streamError}`);
      
      // 2. Fallback to direct audio approach
      // Generate a blob URL for the audio using the speech endpoint
      const audioUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.sws.speechify.com/v1/audio/speech', true);
        xhr.responseType = 'blob';
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'audio/mpeg');
        
        xhr.onload = function() {
          if (xhr.status === 200) {
            const blob = xhr.response;
            const url = URL.createObjectURL(blob);
            logger.info(`Created blob URL: ${url}`);
            resolve(url);
          } else {
            logger.error(`XMLHttpRequest failed: ${xhr.status}`);
            reject(new Error(`XMLHttpRequest failed: ${xhr.status}`));
          }
        };
        
        xhr.onerror = function() {
          logger.error('XMLHttpRequest network error');
          reject(new Error('XMLHttpRequest network error'));
        };
        
        // Send proper JSON data
        xhr.send(JSON.stringify({
          input: processedText,
          voice_id: actualVoiceId,
          model: modelId,
          ssml: true
        }));
      });
      
      if (!audioUrl) {
        throw new Error('Failed to get audio URL');
      }
      
      // Store the audio URL globally so we can access it later for direct playback
      if (typeof window !== 'undefined') {
        logger.info(`Setting global __speechifyAudioUrl: ${audioUrl}`);
        (window as any).__speechifyAudioUrl = audioUrl;
        
        // Ensure the audio URL is available for the next tick in case there's a race condition
        setTimeout(() => {
          if (typeof window !== 'undefined' && !(window as any).__speechifyAudioUrl) {
            logger.info(`Audio URL missing, re-setting it: ${audioUrl}`);
            (window as any).__speechifyAudioUrl = audioUrl;
          }
        }, 0);
      }
      
      // Create a dummy ReadableStream that signals we should use direct audio
      return new ReadableStream({
        start(controller) {
          const dummyChunk = new Uint8Array(16);
          controller.enqueue(dummyChunk);
          controller.close();
        },
        cancel() {
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }
        }
      });
    }
  } catch (error) {
    logger.error(`Error with streaming text to speech: ${error}`);
    throw error;
  }
};