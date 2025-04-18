// Configuration for the extension
// API keys and other sensitive information

// API keys from .env file
export const ELEVENLABS_API_KEY = "sk_fc042545e66483aec48699ef9e733e1de050c2abe060fdba";
export const SPEECHIFY_API_KEY: string = "NOQc8pt7Gr4UvJDM49z2UxHHgpUh4ymh4ukg5A8AQ9s="; // Speechify API key

// Default voice settings
// These are actual ElevenLabs voice IDs
export const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Adam voice

// Default Speechify voice ID
export const DEFAULT_SPEECHIFY_VOICE_ID: string = "default-speechify-voice"; // Default Speechify voice ID

// These are the correct ElevenLabs voice IDs mapped to your UI names
export const VOICE_IDS = {
  "David": "21m00Tcm4TlvDq8ikWAM", // Adam voice renamed to David in UI
  "Emma": "EXAVITQu4vr4xnSDxMaL",  // Elli voice renamed to Emma in UI
  "James": "TxGEqnHWrfWFTfGW9XjX", // Josh voice renamed to James in UI
  "Sofia": "jBpfuIE2acCO8z3wKNLl"  // Rachel voice renamed to Sofia in UI
};

// Speechify voice IDs mapped to UI names
export const SPEECHIFY_VOICE_IDS: Record<string, string> = {
  "David": "david-speechify-voice", // Placeholder Speechify voice ID for David
  "Emma": "emma-speechify-voice",   // Placeholder Speechify voice ID for Emma
  "James": "james-speechify-voice", // Placeholder Speechify voice ID for James
  "Sofia": "sofia-speechify-voice"  // Placeholder Speechify voice ID for Sofia
};

// Model IDs
export const DEFAULT_MODEL_ID = "eleven_turbo_v2"; // ElevenLabs model
export const DEFAULT_SPEECHIFY_MODEL_ID = "simba-english"; // Speechify model

// Other configuration options
export const MAX_AUDIO_BUFFER_DURATION = 90; // Maximum buffer duration in seconds

// TTS Provider selection
export type TTSProvider = "elevenlabs" | "speechify";
export const TTS_PROVIDER: TTSProvider = "speechify"; // Options: "elevenlabs" or "speechify"
