// Text Highlighter for synchronizing text with audio playback
import { AudioStreamPlayer } from '../../audioPlayer';

// Define interfaces for speech marks data
interface Chunk {
  start_time: number;  // Time in milliseconds when this chunk starts in the audio
  end_time: number;    // Time in milliseconds when this chunk ends in the audio
  start: number;       // Character index where this chunk starts in the original text
  end: number;         // Character index where this chunk ends in the original text
  value: string;       // The text content of this chunk
}

interface NestedChunk extends Chunk {
  chunks: Chunk[];     // Array of word-level chunks within this sentence/paragraph
}

export class TextHighlighter {
  private text: string;
  private speechMarks: NestedChunk | null = null;
  private audioPlayer: AudioStreamPlayer;
  private container: HTMLElement | null = null;
  private highlightContainer: HTMLElement | null = null;
  private isActive: boolean = false;
  
  // Store the original onTimeUpdate callback to chain it
  private originalTimeUpdateCallback: ((currentTime: number, duration: number) => void) | null = null;
  
  constructor(audioPlayer: AudioStreamPlayer) {
    this.audioPlayer = audioPlayer;
    this.text = '';
  }
  
  /**
   * Initialize the text highlighter with text and container
   */
  public initialize(text: string, container: HTMLElement): void {
    this.text = text;
    this.container = container;
    
    // Create highlight container if it doesn't exist
    if (!this.highlightContainer) {
      this.createHighlightContainer();
    }
    
    // Reset state
    this.isActive = false;
    this.speechMarks = null;
    
    console.log('[TextHighlighter] Initialized with text length:', text.length);
  }
  
  /**
   * Create the container for highlighted text
   */
  private createHighlightContainer(): void {
    if (!this.container) return;
    
    // Clear any existing highlight container
    const existingContainer = this.container.querySelector('.highlight-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    // Create new highlight container
    this.highlightContainer = document.createElement('div');
    this.highlightContainer.className = 'highlight-container';
    this.highlightContainer.style.position = 'relative';
    this.highlightContainer.style.fontSize = '16px';
    this.highlightContainer.style.lineHeight = '1.5';
    this.highlightContainer.style.fontFamily = 'Arial, sans-serif';
    this.highlightContainer.style.color = '#333';
    this.highlightContainer.style.padding = '10px';
    this.highlightContainer.style.maxHeight = '300px';
    this.highlightContainer.style.overflowY = 'auto';
    this.highlightContainer.style.border = '1px solid #ccc';
    this.highlightContainer.style.borderRadius = '4px';
    this.highlightContainer.style.backgroundColor = '#f9f9f9';
    
    // Append to container
    this.container.appendChild(this.highlightContainer);
    
    console.log('[TextHighlighter] Created highlight container');
  }
  
  /**
   * Set the speech marks data for highlighting
   */
  public setSpeechMarks(speechMarks: NestedChunk): void {
    this.speechMarks = speechMarks;
    console.log('[TextHighlighter] Speech marks set:', 
      speechMarks.chunks ? speechMarks.chunks.length : 'No chunks');
    
    // Render the initial text
    this.renderText();
  }
  
  /**
   * Render the text with span elements for each word
   */
  private renderText(): void {
    if (!this.highlightContainer || !this.speechMarks) return;
    
    // Clear existing content
    this.highlightContainer.innerHTML = '';
    
    // Check if we have word-level chunks
    if (!this.speechMarks.chunks || this.speechMarks.chunks.length === 0) {
      // If no chunks, just display the plain text
      this.highlightContainer.textContent = this.text;
      return;
    }
    
    // Sort chunks by start position to ensure correct order
    const sortedChunks = [...this.speechMarks.chunks].sort((a, b) => a.start - b.start);
    
    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Add spans for each chunk with data attributes for highlighting
    let lastEnd = 0;
    for (const chunk of sortedChunks) {
      // Add any text between chunks
      if (chunk.start > lastEnd) {
        const betweenText = document.createTextNode(this.text.substring(lastEnd, chunk.start));
        fragment.appendChild(betweenText);
      }
      
      // Create span for this chunk
      const span = document.createElement('span');
      span.textContent = chunk.value;
      span.dataset.startTime = chunk.start_time.toString();
      span.dataset.endTime = chunk.end_time.toString();
      span.dataset.textStart = chunk.start.toString();
      span.dataset.textEnd = chunk.end.toString();
      span.className = 'highlightable-word';
      span.style.transition = 'background-color 0.15s ease';
      span.style.borderRadius = '2px';
      span.style.padding = '0 2px';
      
      // Add click event to jump to this word in audio
      span.addEventListener('click', () => this.handleWordClick(chunk));
      
      fragment.appendChild(span);
      lastEnd = chunk.end;
    }
    
    // Add any remaining text
    if (lastEnd < this.text.length) {
      const remainingText = document.createTextNode(this.text.substring(lastEnd));
      fragment.appendChild(remainingText);
    }
    
    // Append all content to the container
    this.highlightContainer.appendChild(fragment);
    
    console.log('[TextHighlighter] Text rendered with', sortedChunks.length, 'highlightable words');
  }
  
  /**
   * Handle clicks on words to jump to that point in the audio
   */
  private handleWordClick(chunk: Chunk): void {
    console.log('[TextHighlighter] Word clicked, seeking to', chunk.start_time, 'ms');
    
    // TODO: Implement seeking functionality in AudioStreamPlayer
    // For now, just log the action
    // In a real implementation, you would call something like:
    // this.audioPlayer.seekTo(chunk.start_time);
  }
  
  /**
   * Start highlighting based on audio player's time updates
   */
  public startHighlighting(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Store the original callback if it exists
    const callbacks = (this.audioPlayer as any)._callbacks;
    if (callbacks && callbacks.onTimeUpdate) {
      this.originalTimeUpdateCallback = callbacks.onTimeUpdate;
    }
    
    // Set our time update callback
    this.audioPlayer.setCallbacks({
      onTimeUpdate: (currentTime, duration) => this.handleTimeUpdate(currentTime, duration)
    });
    
    console.log('[TextHighlighter] Started highlighting');
  }
  
  /**
   * Stop highlighting
   */
  public stopHighlighting(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Restore original callback if it exists
    if (this.originalTimeUpdateCallback) {
      this.audioPlayer.setCallbacks({
        onTimeUpdate: this.originalTimeUpdateCallback
      });
    }
    
    // Clear all highlights
    this.clearHighlights();
    
    console.log('[TextHighlighter] Stopped highlighting');
  }
  
  /**
   * Handle time updates from audio player
   */
  private handleTimeUpdate(currentTime: number, duration: number): void {
    // Convert to milliseconds since speech marks use milliseconds
    const currentTimeMs = currentTime * 1000;
    
    // Highlight the current word
    this.highlightCurrentWord(currentTimeMs);
    
    // Call the original callback if it exists
    if (this.originalTimeUpdateCallback) {
      this.originalTimeUpdateCallback(currentTime, duration);
    }
  }
  
  /**
   * Highlight the word at the current playback time
   */
  private highlightCurrentWord(currentTimeMs: number): void {
    if (!this.highlightContainer || !this.speechMarks || !this.speechMarks.chunks) return;
    
    // Clear existing highlights
    this.clearHighlights();
    
    // Find the current word based on time
    const currentWord = this.speechMarks.chunks.find(chunk => 
      currentTimeMs >= chunk.start_time && currentTimeMs <= chunk.end_time
    );
    
    if (currentWord) {
      // Find the span for this word
      const wordSpan = this.highlightContainer.querySelector(
        `span[data-text-start="${currentWord.start}"][data-text-end="${currentWord.end}"]`
      );
      
      if (wordSpan) {
        // Apply highlight
        wordSpan.style.backgroundColor = '#ffc107';
        wordSpan.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }
  
  /**
   * Clear all highlights
   */
  private clearHighlights(): void {
    if (!this.highlightContainer) return;
    
    // Remove background color from all words
    const words = this.highlightContainer.querySelectorAll('.highlightable-word');
    words.forEach(word => {
      (word as HTMLElement).style.backgroundColor = 'transparent';
    });
  }
  
  /**
   * Mock function to generate speech marks for testing
   * In a real implementation, these would come from the TTS service
   */
  public static generateMockSpeechMarks(text: string): NestedChunk {
    const words = text.split(/\s+/);
    const chunks: Chunk[] = [];
    
    let startIndex = 0;
    let startTime = 0;
    
    words.forEach((word, index) => {
      const start = text.indexOf(word, startIndex);
      const end = start + word.length;
      const wordDuration = word.length * 80; // Roughly 80ms per character
      
      chunks.push({
        start,
        end,
        start_time: startTime,
        end_time: startTime + wordDuration,
        value: word
      });
      
      // Update for next iteration
      startIndex = end;
      startTime += wordDuration + 50; // Add 50ms gap between words
    });
    
    return {
      start: 0,
      end: text.length,
      start_time: 0,
      end_time: startTime,
      value: text,
      chunks
    };
  }
}
