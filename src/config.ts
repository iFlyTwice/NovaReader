// Configuration for the extension
// API keys and other sensitive information

// API keys from .env file
export const SPEECHIFY_API_KEY: string = "NOQc8pt7Gr4UvJDM49z2UxHHgpUh4ymh4ukg5A8AQ9s="; // Speechify API key

// Default Speechify voice ID - updated to new format
export const DEFAULT_SPEECHIFY_VOICE_ID: string = "emma"; // Default Speechify voice ID

// Speechify voice IDs mapped to UI names - updated to new format
export const SPEECHIFY_VOICE_IDS: Record<string, string> = {
  "David": "david", 
  "Emma": "emma",
  "James": "james",
  "Henry": "henry",
  "Sofia": "sofia"
};

// Model IDs
export const DEFAULT_SPEECHIFY_MODEL_ID = "simba-english"; // Speechify model

// Other configuration options
export const MAX_AUDIO_BUFFER_DURATION = 90; // Maximum buffer duration in seconds

// TTS Provider selection - only Speechify is supported now
export type TTSProvider = "speechify";
export const TTS_PROVIDER: TTSProvider = "speechify";