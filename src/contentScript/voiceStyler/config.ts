/**
 * Configuration for the Voice Styler component
 */

// Available emotions for the voice
export const AVAILABLE_EMOTIONS = [
  { id: 'cheerful', name: '😀 Cheerful' },
  { id: 'calm', name: '😌 Calm' },
  { id: 'sad', name: '😢 Sad' },
  { id: 'angry', name: '😠 Angry' },
  { id: 'terrified', name: '😨 Terrified' },
  { id: 'fearful', name: '😱 Fearful' },
  { id: 'surprised', name: '😲 Surprised' },
  { id: 'assertive', name: '😤 Assertive' },
  { id: 'energetic', name: '⚡ Energetic' },
  { id: 'warm', name: '🌞 Warm' },
  { id: 'direct', name: '👉 Direct' },
  { id: 'bright', name: '✨ Bright' }
];

// Available cadences (speeds) for the voice
export const AVAILABLE_CADENCES = [
  { id: 'slow', name: '🐢 Slow (-30%)' },
  { id: 'medium', name: '🚶 Medium' },
  { id: 'fast', name: '🏃 Fast (+30%)' }
];

// Storage keys for saving preferences
export const STORAGE_KEYS = {
  VOICE_EMOTION: 'voiceEmotion',
  VOICE_CADENCE: 'voiceCadence'
};
