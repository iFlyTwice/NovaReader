// Configuration for the extension
// API keys and other sensitive information

// API key from .env file
export const ELEVENLABS_API_KEY = "sk_fc042545e66483aec48699ef9e733e1de050c2abe060fdba";

// Default voice settings
// These are actual ElevenLabs voice IDs
export const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Adam voice

// These are the correct ElevenLabs voice IDs mapped to your UI names
export const VOICE_IDS = {
  "David": "21m00Tcm4TlvDq8ikWAM", // Adam voice renamed to David in UI
  "Emma": "EXAVITQu4vr4xnSDxMaL",  // Elli voice renamed to Emma in UI
  "James": "TxGEqnHWrfWFTfGW9XjX", // Josh voice renamed to James in UI
  "Sofia": "jBpfuIE2acCO8z3wKNLl"  // Rachel voice renamed to Sofia in UI
};
export const DEFAULT_MODEL_ID = "eleven_turbo_v2";

// Other configuration options
export const MAX_AUDIO_BUFFER_DURATION = 90; // Maximum buffer duration in seconds
