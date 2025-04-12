// Audio player implementation for streaming TTS content
import { streamTextToSpeech, textToSpeech } from './elevenLabsApi';

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
  
  // Store current text and voice information
  private currentText: string = '';
  private currentVoiceId: string = '';
  private currentModelId: string = '';
  
  // Streaming setup timeout
  private streamingSetupTimeout: number | null = null;
  
  // Callbacks for state updates
  private onPlaybackStart: () => void = () => {};
  private onPlaybackEnd: () => void = () => {};
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
    onPlaybackError?: (error: string) => void,
    onTimeUpdate?: (currentTime: number, duration: number) => void
  }): void {
    if (callbacks.onPlaybackStart) this.onPlaybackStart = callbacks.onPlaybackStart;
    if (callbacks.onPlaybackEnd) this.onPlaybackEnd = callbacks.onPlaybackEnd;
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
        
        // Immediately fetch and process the stream after the source buffer is created
        this.fetchAndProcessStream();
      } catch (error) {
        console.error('[AudioPlayer] Error setting up MediaSource:', error);
        this.onPlaybackError(`Error setting up audio player: ${error}`);
      }
    });
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
      
      // Get stream from ElevenLabs API
      const stream = await streamTextToSpeech(this.currentText, this.currentVoiceId, this.currentModelId);
      
      if (!stream) {
        console.error('[AudioPlayer] Failed to get audio stream - null stream returned');
        throw new Error('Failed to get audio stream');
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
        this.appendChunk(value.buffer);
      }
    } catch (error) {
      console.error('[AudioPlayer] Error processing stream:', error);
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
      if (this.audioElement.duration) {
        this.onTimeUpdate(this.audioElement.currentTime, this.audioElement.duration);
      }
      
      // Detect when playback has reached the end of buffered content
      // (This helps catch the "end" when streaming is complete)
      if (this.streamingCompleted && this.audioElement.buffered.length > 0) {
        const bufferEndTime = this.audioElement.buffered.end(this.audioElement.buffered.length - 1);
        const timeLeft = bufferEndTime - this.audioElement.currentTime;
        
        // If we're close to the end of buffered content, trigger playback end
        if (timeLeft <= 0.5) {
          this.onPlaybackEnd();
        }
      }
    });
  }
  
  /**
   * Process the append queue to add chunks to the source buffer
   */
  private processAppendQueue(): void {
    if (!this.isAppending && this.appendQueue.length > 0 && !this.isStopped) {
      this.isAppending = true;
      const chunk = this.appendQueue.shift();
      
      if (chunk && this.sourceBuffer && this.mediaSource.readyState === 'open') {
        try {
          this.sourceBuffer.appendBuffer(chunk);
          
          // Manage buffer size to prevent memory issues with long texts
          if (this.mediaSource.duration && this.audioElement.currentTime) {
            const currentTime = this.audioElement.currentTime;
            if (this.mediaSource.duration - currentTime > this.maxBufferDuration) {
              const removeEnd = currentTime - 2; // Keep a small buffer before current time
              if (removeEnd > 0) {
                this.sourceBuffer.remove(0, removeEnd);
              }
            }
          }
        } catch (error) {
          console.error('Error appending buffer:', error);
          this.isAppending = false;
          this.processAppendQueue();
        }
      } else {
        this.isAppending = false;
      }
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
    
    if (this.mediaSource.readyState === 'open' && this.sourceBuffer) {
      try {
        this.sourceBuffer.abort();
        this.mediaSource.removeSourceBuffer(this.sourceBuffer);
      } catch (error) {
        console.error('Error clearing buffer:', error);
      }
    }
    
    this.audioElement.pause();
    this.audioElement.src = '';
    this.streamingCompleted = true;
  }
  
  /**
   * Play text using ElevenLabs API without streaming (for shorter texts)
   * This uses the same approach as the voice selector
   */
  public async playTextNonStreaming(text: string, voiceId: string, modelId: string = 'eleven_turbo_v2'): Promise<void> {
    if (!text.trim()) {
      this.onPlaybackError('No text provided for playback');
      return;
    }
    
    try {
      console.log('[AudioPlayer] Starting non-streaming playback with:', { 
        textLength: text.length, 
        voiceId, 
        modelId 
      });
      
      // Notify that playback is starting
      this.onPlaybackStart();
      
      // Get complete audio data from ElevenLabs API
      console.log('[AudioPlayer] Requesting audio from ElevenLabs API (non-streaming)');
      const audioData = await textToSpeech(text, voiceId, modelId);
      
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
      this.onPlaybackError(`Error playing audio: ${error.message}`);
      this.onPlaybackEnd();
    }
  }
  
  /**
   * Play text using ElevenLabs API
   * This method chooses between streaming and non-streaming based on text length
   */
  public async playText(text: string, voiceId: string, modelId: string = 'eleven_turbo_v2'): Promise<void> {
    if (!text.trim()) {
      this.onPlaybackError('No text provided for playback');
      return;
    }
    
    // Store current text and voice information
    this.currentText = text;
    this.currentVoiceId = voiceId;
    this.currentModelId = modelId;
    
    // Use non-streaming approach for texts under 500 characters
    if (text.length < 500) {
      console.log('[AudioPlayer] Text length under threshold, using non-streaming approach');
      await this.playTextNonStreaming(text, voiceId, modelId);
      return;
    }
    
    // For longer texts, use improved streaming approach
    try {
      console.log('[AudioPlayer] Starting streaming playback with:', { 
        textLength: text.length, 
        voiceId, 
        modelId 
      });
      
      // Reset state
      this.isStopped = false;
      this.streamingCompleted = false;
      this.appendQueue = [];
      this.isAppending = false;
      
      // Reset MediaSource if needed
      this.resetMediaSource();
      
      // Set up AudioElement with MediaSource
      this.audioElement.src = URL.createObjectURL(this.mediaSource);
      
      // Start streaming setup timeout
      this.startStreamingTimeout();
      
      // Start playback - the mediaSource 'sourceopen' event will trigger fetchAndProcessStream
      try {
        await this.audioElement.play();
        console.log('[AudioPlayer] Audio element playback started');
        this.onPlaybackStart();
      } catch (playError) {
        console.error('[AudioPlayer] Error starting audio playback:', playError);
        this.clearStreamingTimeout();
        throw new Error(`Audio playback error: ${playError.message}`);
      }
      
    } catch (error) {
      console.error('[AudioPlayer] Error playing text:', error);
      this.onPlaybackError(`Error playing audio: ${error}`);
      this.stopPlayback();
    }
  }
  
  /**
   * Start a timeout to handle cases where streaming setup takes too long
   */
  private startStreamingTimeout(): void {
    // Clear any existing timeout
    this.clearStreamingTimeout();
    
    // Set a new timeout
    this.streamingSetupTimeout = window.setTimeout(() => {
      console.warn('[AudioPlayer] Streaming setup timeout reached, falling back to non-streaming');
      
      // If we're still waiting for streaming to start properly, fall back to non-streaming
      if (!this.streamingCompleted && this.currentText && this.currentVoiceId) {
        this.stopPlayback();
        this.playTextNonStreaming(this.currentText, this.currentVoiceId, this.currentModelId);
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
   * Stop playback
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
    
    this.onPlaybackEnd();
  }
  
  /**
   * Set playback speed
   */
  public setPlaybackSpeed(speed: number): void {
    this.audioElement.playbackRate = speed;
  }
}