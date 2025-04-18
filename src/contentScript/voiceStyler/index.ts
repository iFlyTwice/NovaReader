/**
 * Main entry point for the Voice Styler component
 */

import { VoiceStyler } from './VoiceStyler';

// Create a single instance of the voice styler
const voiceStyler = new VoiceStyler();

// Export the instance
export default voiceStyler;

// Export the class in case it's needed elsewhere
export { VoiceStyler };

console.log('[VoiceStyler] Initialized');
