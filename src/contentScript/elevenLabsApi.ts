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

// Fetch API key from environment variable using Vite's import.meta.env
// Vite automatically loads variables prefixed with VITE_ from .env files
const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string;
  if (!apiKey) {
    console.error('VITE_ELEVENLABS_API_KEY not found in environment variables');
    return '';
  }
  return apiKey;
};

// Fetch available voices from ElevenLabs API
export const fetchElevenLabsVoices = async (): Promise<Voice[]> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key not available');
    }

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
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key not available');
    }

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
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key not available');
    }

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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.body;
  } catch (error) {
    console.error('Error streaming text to speech:', error);
    return null;
  }
};
