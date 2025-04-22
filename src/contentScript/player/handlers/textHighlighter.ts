// Text Highlighter for synchronizing text with audio playback
import { AudioStreamPlayer } from '../../audioPlayer';
import { createStringTracker, StringTracker } from '../../../stringTracker'; // Import StringTracker from local file

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
  private originalText: string;
  private displayText: string;
  private stringTracker: StringTracker | null = null;
  private speechMarks: NestedChunk | null = null;
  private audioPlayer: AudioStreamPlayer;
  private container: HTMLElement | null = null;
  private highlightContainer: HTMLElement | null = null;
  private isActive: boolean = false;
  
  // Store the original onTimeUpdate callback to chain it
  private originalTimeUpdateCallback: ((currentTime: number, duration: number) => void) | null = null;
  
  constructor(audioPlayer: AudioStreamPlayer) {
    this.audioPlayer = audioPlayer;
    this.originalText = '';
    this.displayText = '';
  }
  
  /**
   * Initialize the text highlighter with text and container
   */
  public initialize(text: string, container: HTMLElement): void {
    this.originalText = text;
    this.displayText = text;
    this.container = container;
    
    // Initialize the StringTracker with the original text
    this.stringTracker = createStringTracker(text);
    
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
    if (!this.highlightContainer || !this.speechMarks || !this.stringTracker) return;
    
    // Clear existing content
    this.highlightContainer.innerHTML = '';
    
    // Check if we have word-level chunks
    if (!this.speechMarks.chunks || this.speechMarks.chunks.length === 0) {
      // If no chunks, just display the plain text
      this.highlightContainer.textContent = this.displayText;
      return;
    }
    
    // Sort chunks by start position to ensure correct order
    const sortedChunks = [...this.speechMarks.chunks].sort((a, b) => a.start - b.start);
    
    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Add spans for each chunk with data attributes for highlighting
    let lastEnd = 0;
    for (const chunk of sortedChunks) {
      // Important: Use stringTracker to map from original (SSML) indices to display indices
      // This handles any differences between the original text and display text
      const mappedStart = this.stringTracker.getIndexOnModified(chunk.start);
      const mappedEnd = this.stringTracker.getIndexOnModified(chunk.end);
      
      // Add any text between chunks
      if (mappedStart > lastEnd) {
        const betweenText = document.createTextNode(this.displayText.substring(lastEnd, mappedStart));
        fragment.appendChild(betweenText);
      }
      
      // Create span for this chunk
      const span = document.createElement('span');
      // Use the display text, not the chunk.value (which might have SSML escaping)
      span.textContent = this.displayText.substring(mappedStart, mappedEnd);
      span.dataset.startTime = chunk.start_time.toString();
      span.dataset.endTime = chunk.end_time.toString();
      span.dataset.textStart = chunk.start.toString();
      span.dataset.textEnd = chunk.end.toString();
      span.dataset.mappedStart = mappedStart.toString();
      span.dataset.mappedEnd = mappedEnd.toString();
      span.className = 'highlightable-word';
      span.style.transition = 'background-color 0.15s ease';
      span.style.borderRadius = '2px';
      span.style.padding = '0 2px';
      
      // Add click event to jump to this word in audio
      span.addEventListener('click', () => this.handleWordClick(chunk));
      
      fragment.appendChild(span);
      lastEnd = mappedEnd;
    }
    
    // Add any remaining text
    if (lastEnd < this.displayText.length) {
      const remainingText = document.createTextNode(this.displayText.substring(lastEnd));
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
    
    // Implement seeking functionality
    const seekTimeSeconds = chunk.start_time / 1000;
    this.audioPlayer.seek(seekTimeSeconds);
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
   * Find the correct chunk for the current time, handling gaps properly
   */
  private findChunkAtTime(currentTimeMs: number): Chunk | null {
    if (!this.speechMarks || !this.speechMarks.chunks) return null;
    
    // Sort chunks by start_time for binary search
    const sortedChunks = [...this.speechMarks.chunks].sort((a, b) => a.start_time - b.start_time);
    
    // Handle the case before any text is spoken
    if (currentTimeMs < sortedChunks[0].start_time) {
      return null;
    }
    
    // Find the last chunk that starts before or at the current time
    let chunk = null;
    for (const c of sortedChunks) {
      if (c.start_time <= currentTimeMs) {
        chunk = c;
        // Don't break, we want the last chunk that starts before currentTimeMs
      } else {
        break; // Stop once we've gone past currentTimeMs
      }
    }
    
    // If we found a chunk, check if the current time is still within its duration
    if (chunk && currentTimeMs <= chunk.end_time) {
      return chunk;
    }
    
    // Handle gaps between chunks by finding the next chunk
    if (chunk) {
      const currentIndex = sortedChunks.indexOf(chunk);
      if (currentIndex < sortedChunks.length - 1) {
        const nextChunk = sortedChunks[currentIndex + 1];
        // If we're in the gap between chunks, but closer to the next chunk
        if (nextChunk.start_time - currentTimeMs < currentTimeMs - chunk.end_time) {
          return nextChunk;
        }
      }
    }
    
    return chunk;
  }
  
  /**
   * Highlight the word at the current playback time
   */
  private highlightCurrentWord(currentTimeMs: number): void {
    if (!this.highlightContainer || !this.speechMarks || !this.stringTracker) return;
    
    // Clear existing highlights
    this.clearHighlights();
    
    // Find the current word based on time, handling gaps
    const currentWord = this.findChunkAtTime(currentTimeMs);
    
    if (currentWord) {
      // Map the original index to the display index using StringTracker
      const mappedStart = this.stringTracker.getIndexOnModified(currentWord.start);
      const mappedEnd = this.stringTracker.getIndexOnModified(currentWord.end);
      
      // Find the span for this word
      const wordSpan = this.highlightContainer.querySelector(
        `span[data-mapped-start="${mappedStart}"][data-mapped-end="${mappedEnd}"]`
      );
      
      if (wordSpan) {
        // Apply highlight
        (wordSpan as HTMLElement).style.backgroundColor = '#ffc107';
        
        // Scroll into view with smooth behavior
        wordSpan.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center', 
          inline: 'center' 
        });
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
   * Process SSML text to handle special characters and XML tags
   * This should be used when text contains SSML markup
   */
  public processSsmlText(ssmlText: string): void {
    if (!this.stringTracker) {
      this.stringTracker = createStringTracker(this.originalText);
    }
    
    // Create a temporary DOM element to parse the SSML (XML)
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<root>${ssmlText}</root>`, 'text/xml');
    
    // Extract text content, removing tags but preserving whitespace
    const textContent = doc.documentElement.textContent || '';
    
    // Update the display text
    this.displayText = textContent;
    
    // Create a new string tracker to map between original SSML and display text
    this.stringTracker = createStringTracker(ssmlText);
    
    // Add operations to transform SSML to plain text
    // This is a simplified example - you'd need to handle all SSML tags appropriately
    
    // Replace all entity references
    const entityRegex = /&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/g;
    let match;
    let offset = 0;
    
    // Create a temporary div to decode entities
    const div = document.createElement('div');
    
    if (this.stringTracker) {
      while ((match = entityRegex.exec(ssmlText)) !== null) {
        // Get the entity's decoded value
        div.innerHTML = match[0];
        const decoded = div.textContent || '';
        
        // Remove the entity and add the decoded character
        let tracker: StringTracker = this.stringTracker.remove(match.index - offset, match.index - offset + match[0].length);
        tracker = tracker.add(match.index - offset, decoded);
        this.stringTracker = tracker;
        
        // Adjust offset based on the difference in length
        offset += (match[0].length - decoded.length);
      }
      
      // Update display text using the tracker
      this.displayText = this.stringTracker.get();
    }
    
    console.log('[TextHighlighter] Processed SSML text');
  }
}