/**
 * Main entry point for the Voice Styler component
 */

import { VoiceStyler } from './VoiceStyler';
import { createLogger } from '../../utils/logger';

// Create a logger instance for this module
const logger = createLogger('VoiceStyler');

// Create a single instance of the voice styler
const voiceStyler = new VoiceStyler();

// Export the instance
export default voiceStyler;

// Export the class in case it's needed elsewhere
export { VoiceStyler };

logger.info('Initialized');
