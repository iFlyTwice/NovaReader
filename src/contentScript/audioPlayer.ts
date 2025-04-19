// Audio player implementation for streaming TTS content
import { streamTextToSpeech, textToSpeech, SSMLStyleOptions } from './speechifyApi';
import { TTS_PROVIDER, DEFAULT_SPEECHIFY_MODEL_ID } from '../config';

// Maximum time to wait for streaming setup in milliseconds (15 seconds)
const STREAMING_TIMEOUT = 15000;

export class AudioStreamPlayer {
  private mediaSource: MediaSource;
  private audioElement: HTMLAudioElement;
  private sourceBuffer: SourceBuffer | null = null;
  private codec: string = 'audio/mpeg';
  private maxBufferDuration: number = 90; // Maximum buffer duration in seconds
  private streamingCompleted: boolean = true;
  private isStopped: boolean = false;
  private appendQueue: ArrayBuffer[] = [];
  private isAppending: boolean = false;
  private isProcessingBuffer = false;
  
  // Store current text and voice information
  private currentText: string = '';
  private currentVoiceId: string = '';
  private currentModelId: string = '';
  private currentSSMLStyle: SSMLStyleOptions | null = null;
  
  // Streaming setup timeout
  private streamingSetupTimeout: number | null = null;
  
  // For Speechify direct audio playback
  private speechifyAudioElement: HTMLAudioElement | null = null;
  
  // Callbacks for state updates
  private onPlaybackStart: () => void = () => {};
  private onPlaybackEnd: () => void = () => {};
  private onPlaybackPause: () => void = () => {}; // New callback for pause
  private onPlaybackError: (error: string) => void = () => {};
  private onTimeUpdate: (currentTime: number, duration: number) => void = () => {};

  constructor() {
    this.mediaSource = new MediaSource();
    this.audioElement = new Audio();
    
    // Set up event listeners
    this.setupMediaSourceEvents();
    this.setupAudioElementEvents();
    
    // Log MediaSource state changes
    this.mediaSource.addEventListener('sourceopen', () => {
      console.log('[AudioPlayer] MediaSource state changed to: sourceopen');
    });
    
    this.mediaSource.addEventListener('sourceended', () => {
      console.log('[AudioPlayer] MediaSource state changed to: sourceended');
    });
    
    this.mediaSource.addEventListener('sourceclose', () => {
      console.log('[AudioPlayer] MediaSource state changed to: sourceclose');
    });
  }
  
  // Reinitialize media source if needed
  private resetMediaSource(): void {
    console.log('[AudioPlayer] Resetting MediaSource object');
    
    // Create a new MediaSource if the current one is in an improper state
    if (this.mediaSource.readyState !== 'closed') {
      try {
        // Try to close the existing MediaSource
        if (this.mediaSource.readyState === 'open') {
          this.mediaSource.endOfStream();
        }
      } catch (error) {
        console.warn('[AudioPlayer] Error ending MediaSource stream:', error);
      }
    }
    
    // Create a new MediaSource object
    this.mediaSource = new MediaSource();
    
    // Set up event listeners again
    this.setupMediaSourceEvents();
    
    // Log MediaSource state changes
    this.mediaSource.addEventListener('sourceopen', () => {
      console.log('[AudioPlayer] New MediaSource state changed to: sourceopen');
    });
  }
  
  /**
   * Set callback functions for different playback events
   */
  public setCallbacks(callbacks: {
    onPlaybackStart?: () => void,
    onPlaybackEnd?: () => void,
    onPlaybackPause?: () => void,
    onPlaybackError?: (error: string) => void,
    onTimeUpdate?: (currentTime: number, duration: number) => void
  }): void {
    if (callbacks.onPlaybackStart) this.onPlaybackStart = callbacks.onPlaybackStart;
    if (callbacks.onPlaybackEnd) this.onPlaybackEnd = callbacks.onPlaybackEnd;
    if (callbacks.onPlaybackPause) this.onPlaybackPause = callbacks.onPlaybackPause;
    if (callbacks.onPlaybackError) this.onPlaybackError = callbacks.onPlaybackError;
    if (callbacks.onTimeUpdate) this.onTimeUpdate = callbacks.onTimeUpdate;
  }
  
  /**
   * Setup MediaSource events
   */
  private setupMediaSourceEvents(): void {
    this.mediaSource.addEventListener('sourceopen', () => {
      try {
        console.log('[AudioPlayer] MediaSource opened, creating source buffer');
        
        // Check if we already have a source buffer
        if (this.mediaSource.sourceBuffers.length > 0) {
          console.log('[AudioPlayer] Source buffer already exists, removing');
          try {
            // Try to remove existing source buffer
            this.mediaSource.removeSourceBuffer(this.mediaSource.sourceBuffers[0]);
          } catch (removeError) {
            console.warn('[AudioPlayer] Error removing existing source buffer:', removeError);
          }
        }
        
        // Create source buffer when MediaSource is open
        try {
          this.sourceBuffer = this.mediaSource.addSourceBuffer(this.codec);
          console.log('[AudioPlayer] Source buffer created successfully');
          
          // Handle buffer updates
          this.sourceBuffer.addEventListener('updateend', () => {
            this.isAppending = false;
            this.processAppendQueue();
          });
          
          // Handle buffer errors
          this.sourceBuffer.addEventListener('error', (e) => {
            console.error('[AudioPlayer] Source buffer error:', e);
            this.onPlaybackError('Source buffer error occurred');
          });
          
          // Handle buffer abort
          this.sourceBuffer.addEventListener('abort', () => {
            console.warn('[AudioPlayer] Source buffer operation aborted');
          });
        } catch (sourceBufferError) {
          console.error('[AudioPlayer] Error creating source buffer:', sourceBufferError);
          
          // For Speechify, use the direct audio approach
          if (TTS_PROVIDER === 'speechify') {
            console.log('[AudioPlayer] Falling back to direct audio approach for Speechify');
            this.useSpeechifyDirectAudio();
            return;
          }
          
          throw sourceBufferError;
        }
        
        // Immediately fetch and process the stream after the source buffer is created
        this.fetchAndProcessStream();
      } catch (error) {
        console.error('[AudioPlayer] Error setting up MediaSource:', error);
        this.onPlaybackError(`Error setting up audio player: ${error}`);
      }
    });
  }
  
  // Special handling for Speechify direct audio
  private useSpeechifyDirectAudio(): void {
    if (TTS_PROVIDER !== 'speechify') return;
    
    console.log('[AudioPlayer] Using direct audio element approach for Speechify');
    
    // We'll fetch the audio directly and play it with a separate Audio element
    this.fetchAndProcessDirectAudio();
  }
  
  // Fetch and process direct audio instead of streaming
  private async fetchAndProcessDirectAudio(): Promise<void> {
    try {
      console.log('[AudioPlayer] Starting direct audio approach for Speechify');
      
      // Before we begin, clear any existing audio URL to avoid using stale data
      if (typeof window !== 'undefined') {
        (window as any).__speechifyAudioUrl = null;
      }
      
      // Allow a little time for any previous calls to finish
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Make the streaming call to the Speechify API to get the audio URL
      await streamTextToSpeech(this.currentText, this.currentVoiceId, this.currentModelId, this.currentSSMLStyle || undefined);
      
      // Add a small delay to ensure the audioUrl is set by the API
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if the speechify audio URL was stored by our API
      const audioUrl = typeof window !== 'undefined' ? (window as any).__speechifyAudioUrl : null;
      
      // If there's no audio URL, make a direct call rather than failing
      if (!audioUrl) {
        console.warn('[AudioPlayer] No audio URL found in global variable, falling back to direct call');
        
        // Import the direct TTS function
        const { textToSpeech } = await import('./speechifyApi');
        
        // Get the audio data directly
        const audioData = await textToSpeech(this.currentText, this.currentVoiceId, this.currentModelId, this.currentSSMLStyle || undefined);
        
        if (!audioData) {
          throw new Error('Failed to get audio data from direct TTS call');
        }
        
        // Create a blob and URL from the audio data
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const directUrl = URL.createObjectURL(blob);
        
        // Create and play the audio
        this.speechifyAudioElement = new Audio(directUrl);
        
        // Set up the same event listeners as below
        this.speechifyAudioElement.onended = () => {
          console.log('[AudioPlayer] Direct audio playback ended');
          if (directUrl) {
            URL.revokeObjectURL(directUrl);
          }
          this.onPlaybackEnd();
        };
        
        this.speechifyAudioElement.ontimeupdate = () => {
          if (this.speechifyAudioElement && this.speechifyAudioElement.duration) {
            this.onTimeUpdate(
              this.speechifyAudioElement.currentTime, 
              this.speechifyAudioElement.duration
            );
          }
        };
        
        this.speechifyAudioElement.onerror = (event) => {
          console.error('[AudioPlayer] Direct audio playback error:', event);
          if (directUrl) {
            URL.revokeObjectURL(directUrl);
          }
          this.onPlaybackError('Error during direct audio playback');
        };
        
        // Start playback
        await this.speechifyAudioElement.play();
        console.log('[AudioPlayer] Direct audio playback started via fallback method');
        this.onPlaybackStart();
        
        return;
      }
      
      console.log('[AudioPlayer] Using direct audio URL:', audioUrl);
      
      // Create a new audio element for direct playback
      this.speechifyAudioElement = new Audio(audioUrl);
      
      // Set up event listeners
      this.speechifyAudioElement.onended = () => {
        console.log('[AudioPlayer] Direct audio playback ended');
        // Clean up URL
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        this.onPlaybackEnd();
      };
      
      this.speechifyAudioElement.ontimeupdate = () => {
        if (this.speechifyAudioElement && this.speechifyAudioElement.duration) {
          this.onTimeUpdate(
            this.speechifyAudioElement.currentTime, 
            this.speechifyAudioElement.duration
          );
        }
      };
      
      this.speechifyAudioElement.onerror = (event) => {
        console.error('[AudioPlayer] Direct audio playback error:', event);
        // Clean up URL
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        this.onPlaybackError('Error during direct audio playback');
      };
      
      // Start playback
      await this.speechifyAudioElement.play();
      console.log('[AudioPlayer] Direct audio playback started');
      this.onPlaybackStart();
      
    } catch (error) {
      console.error('[AudioPlayer] Error with direct audio approach:', error);
      this.onPlaybackError(`Error with direct audio: ${error}`);
    }
  }
  
  // New method to fetch and process the stream
  private async fetchAndProcessStream(): Promise<void> {
    if (!this.currentText || !this.currentVoiceId) {
      console.error('[AudioPlayer] Missing text or voice ID for stream processing');
      this.onPlaybackError('Missing text or voice ID');
      return;
    }
    
    try {
      console.log('[AudioPlayer] Starting to fetch stream with voice ID:', this.currentVoiceId);
      
      // For Speechify, check if we should use the direct audio approach
      if (TTS_PROVIDER === 'speechify') {
        // Signal that we want to use direct audio
        (window as any).__useSpeechifyDirectAudio = true;
      }
      
      // Get stream from TTS API
      const stream = await streamTextToSpeech(
        this.currentText, 
        this.currentVoiceId, 
        this.currentModelId,
        this.currentSSMLStyle || undefined
      );
      
      if (!stream) {
        console.error('[AudioPlayer] Failed to get audio stream - null stream returned');
        throw new Error('Failed to get audio stream');
      }
      
      // We got a stream successfully, clear the timeout since we don't need it anymore
      this.clearStreamingTimeout();
      
      // For Speechify, check if we need to use direct audio
      if (TTS_PROVIDER === 'speechify' && (window as any).__useSpeechifyDirectAudio) {
        console.log('[AudioPlayer] Using Speechify direct audio instead of stream processing');
        // The direct audio approach will be handled separately
        (window as any).__useSpeechifyDirectAudio = false;
        return;
      }
      
      console.log('[AudioPlayer] Stream received, beginning to process chunks');
      // Process the stream
      const reader = stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Stream is complete
          console.log('[AudioPlayer] Stream processing complete');
          this.streamingCompleted = true;
          break;
        }
        
        // Append this chunk to the buffer
        this.appendChunk(value.buffer as ArrayBuffer);
      }
    } catch (error) {
      console.error('[AudioPlayer] Error processing stream:', error);
      
      // For Speechify, try the direct audio approach as fallback
      if (TTS_PROVIDER === 'speechify') {
        console.log('[AudioPlayer] Falling back to direct audio approach for Speechify');
        this.useSpeechifyDirectAudio();
        return;
      }
      
      this.onPlaybackError(`Error playing audio: ${error}`);
      this.stopPlayback();
    }
  }
  
  /**
   * Setup Audio Element events
   */
  private setupAudioElementEvents(): void {
    // Handle playback end
    this.audioElement.addEventListener('ended', () => {
      this.onPlaybackEnd();
    });
    
    // Update time display while playing
    this.audioElement.addEventListener('timeupdate', () => {
      const currentTime = this.audioElement.currentTime;
      this.lastTimeUpdate = currentTime;
      
      if (this.audioElement.duration) {
        this.onTimeUpdate(currentTime, this.audioElement.duration);
      }
      
      // Manage buffer size on each time update for smoother playback
      this.manageBufferSize();
      
      // Detect when playback has reached the end of buffered content
      // (This helps catch the "end" when streaming is complete)
      if (this.streamingCompleted && this.audioElement.buffered.length > 0) {
        const bufferEndTime = this.audioElement.buffered.end(this.audioElement.buffered.length - 1);
        const timeLeft = bufferEndTime - currentTime;
        
        // If we're close to the end of buffered content, trigger playback end
        if (timeLeft <= 0.5) {
          this.onPlaybackEnd();
        }
      }
    });
    
    // Handle audio element errors
    this.audioElement.addEventListener('error', (e) => {
      console.error('[AudioPlayer] Audio element error:', e);
      
      // Get detailed error information
      let errorMessage = 'Unknown error';
      if (this.audioElement.error) {
        errorMessage = this.audioElement.error.message || 'Media error';
        
        // Add more details based on error code
        if (this.audioElement.error.code) {
          switch (this.audioElement.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = 'Playback aborted by the user';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error during playback';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Media decoding error';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Media format not supported';
              break;
          }
        }
      }
      
      // Check if source is empty
      if (!this.audioElement.src || this.audioElement.src === '') {
        errorMessage = 'Empty src attribute';
        console.error('[AudioPlayer] Audio element has empty src attribute');
      }
      
      // For Speechify, try direct audio approach if we get an error
      if (TTS_PROVIDER === 'speechify') {
        console.log('[AudioPlayer] Audio element error for Speechify, trying direct approach');
        this.useSpeechifyDirectAudio();
        return;
      }
      
      this.onPlaybackError(`Audio playback error: ${errorMessage}`);
    });
    
    // Log buffer updates for debugging
    if (this.sourceBuffer) {
      this.sourceBuffer.addEventListener('updateend', () => {
        if (this.sourceBuffer && this.sourceBuffer.buffered.length > 0) {
          const bufferStart = this.sourceBuffer.buffered.start(0);
          const bufferEnd = this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1);
          console.log(`[AudioPlayer] Buffer updated: ${bufferStart.toFixed(2)} - ${bufferEnd.toFixed(2)}, length: ${(bufferEnd - bufferStart).toFixed(2)}s`);
        }
      });
    }
  }
  
  /**
   * Process the append queue to add chunks to the source buffer
   */
  // Keep track of playback position for accurate buffer management
  private lastTimeUpdate: number = 0;
  private bufferFullErrorCount: number = 0;
  private readonly MAX_BUFFER_FULL_ERRORS = 10;

  private processAppendQueue(): void {
    if (this.isAppending || this.appendQueue.length === 0 || this.isStopped) {
      return;
    }
    
    this.isAppending = true;
    const chunk = this.appendQueue.shift();
    
    if (chunk && this.sourceBuffer && this.mediaSource.readyState === 'open') {
      try {
        // Only append if the buffer is not updating
        if (!this.sourceBuffer.updating) {
          // Before appending, check if we need to remove old data from the buffer
          this.manageBufferSize();
          
          try {
            this.sourceBuffer.appendBuffer(chunk);
          } catch (appendError) {
            // For Speechify, if we get an error, try direct audio
            if (TTS_PROVIDER === 'speechify') {
              console.log('[AudioPlayer] Source buffer error for Speechify, trying direct approach');
              this.useSpeechifyDirectAudio();
              this.isAppending = false;
              return;
            }
            
            if ((appendError as any).name === 'QuotaExceededError') {
              // Buffer is full, we need to remove more data
              this.bufferFullErrorCount++;
              console.warn(`[AudioPlayer] Buffer full (error #${this.bufferFullErrorCount}), removing more data before retrying`);
              
              // Put the chunk back at the front of the queue
              this.appendQueue.unshift(chunk);
              
              if (this.bufferFullErrorCount < this.MAX_BUFFER_FULL_ERRORS) {
                // Aggressively remove more data from the buffer
                this.removeMoreBufferData();
                
                // Retry after a short delay
                setTimeout(() => {
                  this.isAppending = false;
                  this.processAppendQueue();
                }, 100);
              } else {
                // Too many buffer full errors, something is wrong
                console.error('[AudioPlayer] Too many buffer full errors, playback may be unstable');
                this.onPlaybackError('Media buffer is full. This text may be too large for continuous playback.');
                this.bufferFullErrorCount = 0;
                this.isAppending = false;
              }
              return;
            } else {
              // Some other error, rethrow
              throw appendError;
            }
          }
        } else {
          // Put the chunk back at the front of the queue
          this.appendQueue.unshift(chunk);
          this.isAppending = false;
          
          // Retry after a short delay
          setTimeout(() => this.processAppendQueue(), 50);
          return;
        }
      } catch (error) {
        console.error('Error appending buffer:', error);
        this.isAppending = false;
        
        // If the error indicates the buffer is busy, retry after a delay
        if ((error as any).name === 'InvalidStateError') {
          setTimeout(() => this.processAppendQueue(), 100);
        }
      }
    } else {
      this.isAppending = false;
    }
  }
  
  /**
   * Manage the media buffer size to prevent overflow
   */
  private manageBufferSize(): void {
    if (!this.sourceBuffer || this.sourceBuffer.updating) return;
    
    try {
      const currentTime = this.audioElement.currentTime;
      this.lastTimeUpdate = currentTime;
      
      // Only keep a buffer window of the most recent content if we have buffered content
      if (this.sourceBuffer.buffered.length > 0) {
        const bufferStart = this.sourceBuffer.buffered.start(0);
        const bufferEnd = this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1);
        const bufferLength = bufferEnd - bufferStart;
        
        // If we have more than 30 seconds in the buffer behind the current playback position
        // remove older content to make room for new content
        if (currentTime > 30 && bufferStart < currentTime - 30) {
          const removeEnd = currentTime - 10; // Keep a small buffer before current position
          if (removeEnd > bufferStart) {
            console.log(`[AudioPlayer] Removing buffer data from ${bufferStart.toFixed(2)} to ${removeEnd.toFixed(2)}`);
            this.sourceBuffer.remove(bufferStart, removeEnd);
          }
        }
      }
    } catch (error) {
      console.warn('[AudioPlayer] Error managing buffer size:', error);
    }
  }
  
  /**
   * Aggressively remove more buffer data when the buffer is full
   */
  private removeMoreBufferData(): void {
    if (!this.sourceBuffer || this.sourceBuffer.updating) return;
    
    try {
      const currentTime = this.audioElement.currentTime;
      
      if (this.sourceBuffer.buffered.length > 0) {
        const bufferStart = this.sourceBuffer.buffered.start(0);
        const bufferEnd = this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1);
        
        // Aggressively remove more data, keeping only 5 seconds before current position
        const removeEnd = Math.max(bufferStart, currentTime - 5);
        if (removeEnd > bufferStart) {
          console.log(`[AudioPlayer] Aggressively removing buffer data from ${bufferStart.toFixed(2)} to ${removeEnd.toFixed(2)}`);
          this.sourceBuffer.remove(bufferStart, removeEnd);
        }
      }
    } catch (error) {
      console.warn('[AudioPlayer] Error removing buffer data:', error);
    }
  }
  
  /**
   * Add a chunk of audio data to the buffer
   */
  private appendChunk(chunk: ArrayBuffer): void {
    if (this.isStopped) return;
    
    this.appendQueue.push(chunk);
    this.processAppendQueue();
  }
  
  /**
   * Clear the audio buffer and reset state
   */
  private clearBuffer(): void {
    this.isStopped = true;
    this.appendQueue = [];
    this.isAppending = false;
    
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      try {
        if (this.sourceBuffer) {
          try {
            this.sourceBuffer.abort();
          } catch (abortError) {
            console.warn('[AudioPlayer] Error aborting source buffer:', abortError);
          }
          
          try {
            this.mediaSource.removeSourceBuffer(this.sourceBuffer);
          } catch (removeError) {
            console.warn('[AudioPlayer] Error removing source buffer:', removeError);
          }
          
          this.sourceBuffer = null;
        }
        
        try {
          this.mediaSource.endOfStream();
        } catch (endError) {
          console.warn('[AudioPlayer] Error ending media source stream:', endError);
        }
      } catch (error) {
        console.error('[AudioPlayer] Error clearing buffer:', error);
      }
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    
    // Also clean up speechify direct audio if it exists
    if (this.speechifyAudioElement) {
      this.speechifyAudioElement.pause();
      if (this.speechifyAudioElement.src && this.speechifyAudioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.speechifyAudioElement.src);
      }
      this.speechifyAudioElement.src = '';
      this.speechifyAudioElement = null;
    }
    
    this.streamingCompleted = true;
  }
  
  /**
   * Play text using TTS API without streaming (for shorter texts)
   * This uses the same approach as the voice selector
   */
  public async playTextNonStreaming(
    text: string, 
    voiceId: string, 
    modelId?: string,
    ssmlStyle?: SSMLStyleOptions
  ): Promise<void> {
    if (!text.trim()) {
      this.onPlaybackError('No text provided for playback');
      return;
    }
    
    // Use the Speechify model ID
    const finalModelId = modelId || DEFAULT_SPEECHIFY_MODEL_ID;
    
    try {
      console.log('[AudioPlayer] Starting non-streaming playback with:', { 
        textLength: text.length, 
        voiceId, 
        modelId: finalModelId,
        ssmlStyle: ssmlStyle ? 'Yes' : 'No',
        provider: TTS_PROVIDER
      });
      
      // Notify that playback is starting
      this.onPlaybackStart();
      
      // Get complete audio data from TTS API
      console.log(`[AudioPlayer] Requesting audio from ${TTS_PROVIDER} API (non-streaming)`);
      const audioData = await textToSpeech(text, voiceId, finalModelId, ssmlStyle);
      
      if (!audioData) {
        console.error('[AudioPlayer] Failed to get audio data - null returned');
        throw new Error('Failed to get audio data');
      }
      
      console.log('[AudioPlayer] Audio data received, length:', audioData.byteLength);
      
      // Create a blob from the audio data
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      // Use a simple Audio element directly
      this.audioElement = new Audio(url);
      
      // Set up audio events
      this.audioElement.onended = () => {
        console.log('[AudioPlayer] Playback completed');
        URL.revokeObjectURL(url); // Clean up
        this.onPlaybackEnd();
      };
      
      this.audioElement.ontimeupdate = () => {
        if (this.audioElement.duration) {
          this.onTimeUpdate(this.audioElement.currentTime, this.audioElement.duration);
        }
      };
      
      this.audioElement.onerror = (event) => {
        console.error('[AudioPlayer] Audio playback error:', event);
        URL.revokeObjectURL(url); // Clean up
        this.onPlaybackError('Error during audio playback');
      };
      
      // Start playback
      await this.audioElement.play();
      console.log('[AudioPlayer] Audio playback started (non-streaming)');
      
    } catch (error) {
      console.error('[AudioPlayer] Error playing text (non-streaming):', error);
      
      // For Speechify, try the direct audio approach
      if (TTS_PROVIDER === 'speechify') {
        console.log('[AudioPlayer] Error with non-streaming, trying direct approach for Speechify');
        this.currentText = text;
        this.currentVoiceId = voiceId;
        this.currentModelId = finalModelId;
        this.currentSSMLStyle = ssmlStyle || null;
        
        this.useSpeechifyDirectAudio();
        return;
      }
      
      this.onPlaybackError(`Error playing audio: ${(error as any).message}`);
      this.onPlaybackEnd();
    }
  }
  
  // Max characters for non-streaming playback
  private MAX_NON_STREAMING_LENGTH: number = 3000;
  
  /**
   * Play text using TTS API with SSML styling support
   */
  public async playText(
    text: string, 
    voiceId: string, 
    modelId?: string,
    ssmlStyle?: SSMLStyleOptions
  ): Promise<void> {
    if (!text.trim()) {
      this.onPlaybackError('No text provided for playback');
      return;
    }
    
    // Use the Speechify model ID
    // If model ID contains 'eleven_', override it with Speechify model
    let finalModelId = modelId;
    
    // Check if we need to override the model ID
    if (modelId && modelId.startsWith('eleven_')) {
      console.log(`[AudioPlayer] Overriding ElevenLabs model ID ${modelId} with default Speechify model: ${DEFAULT_SPEECHIFY_MODEL_ID}`);
      finalModelId = DEFAULT_SPEECHIFY_MODEL_ID;
    }
    
    // If no model ID is provided, use the default Speechify model
    if (!finalModelId) {
      finalModelId = DEFAULT_SPEECHIFY_MODEL_ID;
    }
    
    // If we're using cadence styling, make sure to use simba-turbo model
    if (ssmlStyle && ssmlStyle.cadence && finalModelId !== 'simba-turbo') {
      console.log('[AudioPlayer] Cadence styling requested, switching to simba-turbo model');
      finalModelId = 'simba-turbo';
    }
    
    console.log(`[AudioPlayer] Using model ID: ${finalModelId} for provider: ${TTS_PROVIDER}`);
    
    // Store current text and voice information
    this.currentText = text;
    this.currentVoiceId = voiceId;
    this.currentModelId = finalModelId;
    this.currentSSMLStyle = ssmlStyle || null;
    
    // For very short texts, we can still use non-streaming as it's faster
    if (text.length < 200) {
      console.log('[AudioPlayer] Text length very short, using non-streaming approach');
      await this.playTextNonStreaming(text, voiceId, finalModelId, ssmlStyle);
      return;
    }
    
    // For all other texts, always use streaming approach
    try {
      console.log('[AudioPlayer] Starting streaming playback with:', { 
        textLength: text.length, 
        voiceId, 
        modelId: finalModelId,
        ssmlStyle: ssmlStyle ? 'Yes' : 'No',
        provider: TTS_PROVIDER
      });
      
      // For Speechify, check if we should use direct audio approach
      if (TTS_PROVIDER === 'speechify') {
        console.log('[AudioPlayer] Using direct audio approach for Speechify');
        this.useSpeechifyDirectAudio();
        return;
      }
      
      // Reset state
      this.isStopped = false;
      this.streamingCompleted = false;
      this.appendQueue = [];
      this.isAppending = false;
      
      // Reset MediaSource if needed
      this.resetMediaSource();
      
      // Create a new audio element to ensure clean state
      this.audioElement = new Audio();
      this.setupAudioElementEvents();
      
      // First create the object URL and assign it to the audio element
      const sourceUrl = URL.createObjectURL(this.mediaSource);
      console.log('[AudioPlayer] Created MediaSource URL:', sourceUrl);
      this.audioElement.src = sourceUrl;
      
      // Start streaming setup timeout - only to detect if streaming fails to start at all
      this.startStreamingTimeout();
      
      // Check if MediaSource is ready
      const waitForMediaSourceOpen = new Promise<void>((resolve, reject) => {
        // Only wait if not already open
        if (this.mediaSource.readyState !== 'open') {
          console.log('[AudioPlayer] Waiting for MediaSource to open...');
          const timeout = setTimeout(() => {
            reject(new Error('MediaSource open timeout'));
          }, 5000);
          
          this.mediaSource.addEventListener('sourceopen', () => {
            clearTimeout(timeout);
            console.log('[AudioPlayer] MediaSource opened');
            resolve();
          }, { once: true });
        } else {
          console.log('[AudioPlayer] MediaSource already open');
          resolve();
        }
      });
      
      try {
        // Wait for MediaSource to be ready
        await waitForMediaSourceOpen;
        
        // Now try to start playback
        await this.audioElement.play();
        console.log('[AudioPlayer] Audio element playback started');
        this.onPlaybackStart();
      } catch (playError) {
        console.error('[AudioPlayer] Error starting audio playback:', playError);
        this.clearStreamingTimeout();
        
        // For Speechify, try direct audio approach
        if (TTS_PROVIDER === 'speechify') {
          console.log('[AudioPlayer] Error starting playback, trying direct approach for Speechify');
          this.useSpeechifyDirectAudio();
          return;
        }
        
        throw new Error(`Audio playback error: ${(playError as any).message}`);
      }
      
    } catch (error) {
      console.error('[AudioPlayer] Error playing text:', error);
      this.onPlaybackError(`Error playing audio: ${error}`);
      this.stopPlayback();
    }
  }
  
  /**
   * Play audio from a URL (for speech marks integration)
   */
  public async playWithUrl(url: string): Promise<void> {
    try {
      console.log('[AudioPlayer] Playing audio from URL:', url);
      
      // Create a new Audio element for this URL
      this.audioElement = new Audio(url);
      
      // Set up event listeners
      this.audioElement.onended = () => {
        console.log('[AudioPlayer] URL playback ended');
        URL.revokeObjectURL(url); // Clean up
        this.onPlaybackEnd();
      };
      
      this.audioElement.ontimeupdate = () => {
        if (this.audioElement.duration) {
          this.onTimeUpdate(this.audioElement.currentTime, this.audioElement.duration);
        }
      };
      
      this.audioElement.onerror = (event) => {
        console.error('[AudioPlayer] URL playback error:', event);
        URL.revokeObjectURL(url); // Clean up
        this.onPlaybackError('Error during URL playback');
      };
      
      // Start playback
      await this.audioElement.play();
      console.log('[AudioPlayer] URL playback started');
      this.onPlaybackStart();
      
    } catch (error) {
      console.error('[AudioPlayer] Error playing from URL:', error);
      this.onPlaybackError(`Error playing from URL: ${error}`);
    }
  }
  
  /**
   * Start a timeout to handle cases where streaming setup takes too long
   * This is only used to detect if streaming fails to start at all
   */
  private startStreamingTimeout(): void {
    // Clear any existing timeout
    this.clearStreamingTimeout();
    
    // Set a new timeout only for initial streaming start
    this.streamingSetupTimeout = window.setTimeout(() => {
      // Check if we've already received any streaming data
      if (this.appendQueue.length === 0 && !this.streamingCompleted) {
        console.warn('[AudioPlayer] Streaming setup timeout reached - streaming failed to start');
        
        // Only clean up and use fallback if streaming didn't start at all
        this.clearBuffer();
        
        // For Speechify, try direct audio approach
        if (TTS_PROVIDER === 'speechify') {
          console.log('[AudioPlayer] Streaming timeout, trying direct approach for Speechify');
          this.useSpeechifyDirectAudio();
          return;
        }
        
        // Here we would typically fall back to non-streaming, but per request we'll just show an error
        this.onPlaybackError('Streaming timeout: Failed to start streaming playback');
      } else {
        // Streaming has already started, so we don't need to do anything
        console.log('[AudioPlayer] Streaming data received, ignoring timeout');
      }
    }, STREAMING_TIMEOUT);
  }
  
  /**
   * Clear the streaming setup timeout
   */
  private clearStreamingTimeout(): void {
    if (this.streamingSetupTimeout !== null) {
      window.clearTimeout(this.streamingSetupTimeout);
      this.streamingSetupTimeout = null;
    }
  }

  /**
   * Pause playback without clearing the audio buffer
   * This allows for resuming from the paused position
   */
  public pausePlayback(): void {
    console.log('🔊 [Audio] Pausing playback');
    
    // Pause the main audio element
    if (this.audioElement) {
      this.audioElement.pause();
      console.log('🔊 [Audio] Paused successfully');
    }
    
    // Also pause the speechify direct audio element if it exists
    if (this.speechifyAudioElement) {
      this.speechifyAudioElement.pause();
      console.log('🔊 [Audio] Paused speechify direct audio');
    }
    
    // Use dedicated pause callback instead of the end callback
    // This allows us to update UI without resetting playback state
    this.onPlaybackPause();
  }

  /**
   * Resume playback from the current position
   */
  public resumePlayback(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        console.log('[AudioPlayer] Resuming playback');
        
        // For Speechify direct audio
        if (this.speechifyAudioElement) {
          await this.speechifyAudioElement.play();
          this.onPlaybackStart();
          resolve();
          return;
        }
        
        // For regular audio
        if (this.audioElement) {
          // Just play the audio element from its current position
          await this.audioElement.play();
          this.onPlaybackStart();
          resolve();
        } else {
          throw new Error('Audio element not available for resuming');
        }
      } catch (error) {
        console.error('[AudioPlayer] Error resuming playback:', error);
        this.onPlaybackError(`Failed to resume playback: ${error}`);
        reject(error);
      }
    });
  }

  /**
   * Stop playback completely
   */
  public stopPlayback(): void {
    // Clear any streaming timeout
    this.clearStreamingTimeout();
    
    // For streaming playback, clear the buffer
    this.clearBuffer();
    
    // For non-streaming playback, pause and reset the audio element
    if (this.audioElement) {
      this.audioElement.pause();
      
      // If there's a direct URL source (non-streaming), clean it up
      if (this.audioElement.src && this.audioElement.src.startsWith('blob:')) {
        const blobUrl = this.audioElement.src;
        this.audioElement.src = '';
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (error) {
          console.warn('[AudioPlayer] Error revoking object URL:', error);
        }
      }
    }
    
    // Also clean up speechify direct audio if it exists
    if (this.speechifyAudioElement) {
      this.speechifyAudioElement.pause();
      if (this.speechifyAudioElement.src && this.speechifyAudioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.speechifyAudioElement.src);
      }
      this.speechifyAudioElement.src = '';
      this.speechifyAudioElement = null;
    }
    
    this.onPlaybackEnd();
  }
  
  /**
   * Set playback speed
   */
  public setPlaybackSpeed(speed: number): void {
    if (this.audioElement) {
      this.audioElement.playbackRate = speed;
    }
    
    if (this.speechifyAudioElement) {
      this.speechifyAudioElement.playbackRate = speed;
    }
  }
  
  /**
   * Seek to a specific position in the audio (in seconds)
   */
  public seek(timeInSeconds: number): void {
    console.log('[AudioPlayer] Seeking to', timeInSeconds, 'seconds');
    
    // For Speechify direct audio
    if (this.speechifyAudioElement) {
      this.speechifyAudioElement.currentTime = timeInSeconds;
      return;
    }
    
    // For regular audio
    if (this.audioElement) {
      this.audioElement.currentTime = timeInSeconds;
    }
  }
  
  /**
   * Seek to a specific position and ensure playback is started/resumed
   */
  public seekAndPlay(timeInSeconds: number): void {
    console.log('[AudioPlayer] Seeking to and playing from', timeInSeconds, 'seconds');
    
    // For Speechify direct audio
    if (this.speechifyAudioElement) {
      this.speechifyAudioElement.currentTime = timeInSeconds;
      this.speechifyAudioElement.play()
        .then(() => this.onPlaybackStart())
        .catch(error => {
          console.error('[AudioPlayer] Error resuming Speechify playback after seek:', error);
          this.onPlaybackError(`Failed to resume playback: ${error}`);
        });
      return;
    }
    
    // For regular audio
    if (this.audioElement) {
      this.audioElement.currentTime = timeInSeconds;
      this.audioElement.play()
        .then(() => this.onPlaybackStart())
        .catch(error => {
          console.error('[AudioPlayer] Error resuming playback after seek:', error);
          this.onPlaybackError(`Failed to resume playback: ${error}`);
        });
    }
  }
}