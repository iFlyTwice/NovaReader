// Inline Text Highlighter for synchronizing text with audio playback
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

export class InlineTextHighlighter {
  private audioPlayer: AudioStreamPlayer;
  private speechMarks: NestedChunk | null = null;
  private isActive: boolean = false;
  private selectionText: string = '';
  private textElements: HTMLElement[] = [];
  private originalTimeUpdateCallback: ((currentTime: number, duration: number) => void) | null = null;
  private highlightClassName: string = 'nova-reader-highlight';
  private highlightedElements: HTMLElement[] = [];
  private highlightColor: string = '#ffc107'; // Default yellow highlight color
  
  // Configuration
  private config = {
    highlightColor: '#ffc107',
    highlightOpacity: 0.4,
    transitionSpeed: '0.2s',
    wordByWord: true
  };
  
  constructor(audioPlayer: AudioStreamPlayer) {
    this.audioPlayer = audioPlayer;
    
    // Create styles for highlighting
    this.createHighlightStyles();
  }
  
  /**
   * Create CSS styles for highlighting
   */
  private createHighlightStyles(): void {
    // Check if styles already exist
    if (document.getElementById('nova-reader-highlight-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'nova-reader-highlight-styles';
    style.textContent = `
      .${this.highlightClassName} {
        background-color: ${this.config.highlightColor} !important;
        opacity: ${this.config.highlightOpacity};
        transition: background-color ${this.config.transitionSpeed} ease;
        border-radius: 2px;
        cursor: pointer;
      }
      
      .nova-reader-wrapper {
        display: inline;
        position: relative;
      }
      
      @keyframes nova-reader-pulse {
        0% { opacity: ${this.config.highlightOpacity}; }
        50% { opacity: ${this.config.highlightOpacity + 0.2}; }
        100% { opacity: ${this.config.highlightOpacity}; }
      }
      
      .${this.highlightClassName}-active {
        background-color: ${this.config.highlightColor} !important;
        opacity: ${this.config.highlightOpacity + 0.3};
        animation: nova-reader-pulse 1s infinite;
      }
    `;
    
    document.head.appendChild(style);
    console.log('[InlineTextHighlighter] Highlight styles created');
  }
  
  /**
   * Initialize the highlighter with selected text
   */
  public initialize(text: string): void {
    this.selectionText = text;
    
    // Try to find text on the page
    this.findTextOnPage();
    
    console.log('[InlineTextHighlighter] Initialized with text length:', text.length);
  }
  
  /**
   * Find text on the page and prepare elements for highlighting
   */
  private findTextOnPage(): void {
    // Clear any previous elements
    this.textElements = [];
    
    // First try to match the exact full text in a single element
    const fullTextElements = this.findElementsWithExactText(this.selectionText);
    
    if (fullTextElements.length > 0) {
      // Use the first found element
      this.textElements = [fullTextElements[0]];
      console.log('[InlineTextHighlighter] Found exact text match');
    } else {
      // If no exact match, try to find the text spread across multiple elements
      // This is more complex and might not be perfectly accurate
      this.textElements = this.findElementsWithPartialText(this.selectionText);
      console.log('[InlineTextHighlighter] Found partial text matches:', this.textElements.length);
    }
    
    // If we found elements, prepare them for highlighting
    if (this.textElements.length > 0) {
      this.wrapWordsForHighlighting();
    }
  }
  
  /**
   * Find elements that contain the exact text
   */
  private findElementsWithExactText(text: string): HTMLElement[] {
    const result: HTMLElement[] = [];
    const elements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, li');
    
    elements.forEach(element => {
      if (element.textContent?.trim() === text.trim()) {
        result.push(element as HTMLElement);
      }
    });
    
    return result;
  }
  
  /**
   * Find elements that contain parts of the text
   */
  private findElementsWithPartialText(text: string): HTMLElement[] {
    const textNodes: HTMLElement[] = [];
    const treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip empty text nodes and nodes in scripts, styles
          if (node.textContent?.trim() === '' || 
              ['SCRIPT', 'STYLE', 'META', 'LINK'].includes(node.parentElement?.tagName || '')) {
            return NodeFilter.FILTER_REJECT;
          }
          // Accept nodes that contain any part of our text
          if (node.textContent && text.includes(node.textContent.trim())) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    let node;
    while (node = treeWalker.nextNode()) {
      if (node.parentElement) {
        textNodes.push(node.parentElement as HTMLElement);
      }
    }
    
    return textNodes;
  }
  
  /**
   * Wrap words in spans for highlighting
   */
  private wrapWordsForHighlighting(): void {
    this.textElements.forEach(element => {
      // Skip if already processed
      if (element.classList.contains('nova-reader-processed')) return;
      
      const content = element.innerHTML;
      // Split content by words, preserving spaces and punctuation
      const wordPattern = /(\S+)(\s*)/g;
      let match;
      let newContent = '';
      let index = 0;
      
      while ((match = wordPattern.exec(content)) !== null) {
        const word = match[1]; // The word
        const space = match[2]; // The following space/whitespace
        
        // Wrap the word in a span with data attributes for time mapping later
        newContent += `<span class="nova-reader-word" data-index="${index}">${word}</span>${space}`;
        index++;
      }
      
      // Update the element's content
      element.innerHTML = newContent;
      element.classList.add('nova-reader-processed');
      
      // Add click handlers to words
      const wordElements = element.querySelectorAll('.nova-reader-word');
      wordElements.forEach(wordElement => {
        wordElement.addEventListener('click', () => {
          this.handleWordClick(wordElement as HTMLElement);
        });
      });
    });
    
    console.log('[InlineTextHighlighter] Words wrapped for highlighting');
  }
  
  /**
   * Handle click on a word to seek audio
   */
  private handleWordClick(wordElement: HTMLElement): void {
    if (!this.speechMarks || !this.isActive) return;
    
    const index = parseInt(wordElement.getAttribute('data-index') || '0');
    
    // Find the corresponding chunk based on index
    if (this.speechMarks.chunks && this.speechMarks.chunks.length > index) {
      const chunk = this.speechMarks.chunks[index];
      console.log('[InlineTextHighlighter] Word clicked, seeking to', chunk.start_time, 'ms');
      
      // TODO: Implement seeking in AudioStreamPlayer
      // this.audioPlayer.seekTo(chunk.start_time);
    }
  }
  
  /**
   * Set speech marks data for highlighting
   */
  public setSpeechMarks(speechMarks: NestedChunk): void {
    this.speechMarks = speechMarks;
    console.log('[InlineTextHighlighter] Speech marks set:', 
      speechMarks.chunks ? speechMarks.chunks.length : 'No chunks');
    
    // Map speech marks to wrapped words
    this.mapSpeechMarksToWords();
  }
  
  /**
   * Map speech marks timing data to wrapped word elements
   */
  private mapSpeechMarksToWords(): void {
    if (!this.speechMarks || !this.speechMarks.chunks) return;
    
    this.textElements.forEach(element => {
      const wordElements = element.querySelectorAll('.nova-reader-word');
      
      wordElements.forEach((wordElement, index) => {
        if (this.speechMarks?.chunks && index < this.speechMarks.chunks.length) {
          const chunk = this.speechMarks.chunks[index];
          wordElement.setAttribute('data-start-time', chunk.start_time.toString());
          wordElement.setAttribute('data-end-time', chunk.end_time.toString());
        }
      });
    });
    
    console.log('[InlineTextHighlighter] Speech marks mapped to words');
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
    
    console.log('[InlineTextHighlighter] Started highlighting');
  }
  
  /**
   * Stop highlighting and restore original state
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
    
    console.log('[InlineTextHighlighter] Stopped highlighting');
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
    if (!this.speechMarks || !this.speechMarks.chunks || !this.isActive) return;
    
    // Clear existing highlights
    this.clearHighlights();
    
    // Find the current word based on time
    const currentChunk = this.speechMarks.chunks.find(chunk => 
      currentTimeMs >= chunk.start_time && currentTimeMs <= chunk.end_time
    );
    
    if (currentChunk) {
      // Find the chunk index
      const chunkIndex = this.speechMarks.chunks.indexOf(currentChunk);
      
      this.textElements.forEach(element => {
        const wordElement = element.querySelector(`.nova-reader-word[data-index="${chunkIndex}"]`);
        
        if (wordElement) {
          // Apply active highlight
          wordElement.classList.add(`${this.highlightClassName}-active`);
          this.highlightedElements.push(wordElement as HTMLElement);
          
          // Scroll to the word if it's not visible
          this.scrollToElementIfNeeded(wordElement as HTMLElement);
        }
      });
    }
  }
  
  /**
   * Scroll to element if it's not visible in viewport
   */
  private scrollToElementIfNeeded(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
    
    if (!isVisible) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }
  
  /**
   * Clear all highlights
   */
  private clearHighlights(): void {
    this.highlightedElements.forEach(element => {
      element.classList.remove(`${this.highlightClassName}-active`);
    });
    this.highlightedElements = [];
  }
  
  /**
   * Clean up when done
   */
  public cleanup(): void {
    // Stop highlighting
    this.stopHighlighting();
    
    // Remove processing classes
    this.textElements.forEach(element => {
      element.classList.remove('nova-reader-processed');
    });
    
    // Clean up wrapped words (restore original content)
    // This is complex and might not be perfect - omitted for brevity
    
    console.log('[InlineTextHighlighter] Cleaned up');
  }
  
  /**
   * Mock function to generate speech marks for testing
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
  
  /**
   * Set highlight color
   */
  public setHighlightColor(color: string): void {
    this.config.highlightColor = color;
    this.createHighlightStyles(); // Recreate styles with new color
  }
}
