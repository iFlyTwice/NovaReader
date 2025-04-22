// Improved Inline Text Highlighter using StringTracker for accurate synchronization
import { AudioStreamPlayer } from '../../audioPlayer';
import { createStringTracker, StringTracker } from '../../../stringTracker'; // Import StringTracker from local file
import { createLogger } from '../../../utils/logger';
import { SentenceHighlighter } from './sentenceHighlighter';

// Add type declarations for CSS Paint API
declare global {
  interface PaintWorklet {
    addModule(moduleURL: string): Promise<void>;
  }
  
  interface CSS {
    paintWorklet: PaintWorklet;
  }
}

// Create a logger instance for this module
const logger = createLogger('TextHighlighter');

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
  private originalText: string = '';
  private stringTracker: StringTracker | null = null;
  private textElements: HTMLElement[] = [];
  private originalTimeUpdateCallback: ((currentTime: number, duration: number) => void) | null = null;
  private highlightClassName: string = 'nova-reader-highlight';
  private highlightedElements: HTMLElement[] = [];
  private highlightColor: string = '#ffc107'; // Default yellow highlight color
  private sentenceHighlighter: SentenceHighlighter;
  private isPaintWorkletRegistered: boolean = false;
  
  // Configuration
  private config = {
    highlightColor: '#7d8aef',  // Base blue color for highlighting
    activeHighlightColor: '#5a68e3', // Slightly darker blue for active words
    highlightOpacity: 0.35,     // Increased opacity for better visibility
    activeHighlightOpacity: 0.6, // Higher opacity for active word
    transitionSpeed: '0.25s',   // Slightly faster for more responsive feeling
    easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Material Design easing for smoother transitions
    wordByWord: true,
    useHoudini: false           // Flag to toggle between CSS Paint API and regular CSS
  };
  
  constructor(audioPlayer: AudioStreamPlayer) {
    this.audioPlayer = audioPlayer;
    this.sentenceHighlighter = new SentenceHighlighter();
    
    // Try to detect if CSS Paint API is supported
    if (window.CSS && CSS.paintWorklet) {
      this.config.useHoudini = true;
      logger.info('[HIGHLIGHT TYPE] CSS Paint API (Houdini) is supported. Will attempt to use Paint Worklet for highlighting.');
      this.registerPaintWorklet();
    } else {
      logger.warn('[HIGHLIGHT TYPE] CSS Paint API not supported in this browser. Using fallback regular CSS highlighting.');
    }
    
    // Create styles for highlighting
    this.createHighlightStyles();
  }
  
  /**
   * Register the CSS Paint Worklet
   */
  private registerPaintWorklet(): void {
    if (this.isPaintWorkletRegistered || !CSS.paintWorklet) return;
    
    try {
      // Register the paint worklet
      CSS.paintWorklet.addModule(chrome.runtime.getURL('contentScript/textHighlight.js'));
      this.isPaintWorkletRegistered = true;
      logger.info('[HIGHLIGHT TYPE] Successfully registered text highlight Paint Worklet. Using CSS Paint API for highlighting.');
    } catch (error) {
      logger.error(`[HIGHLIGHT TYPE] Failed to register paint worklet: ${error}`);
      // Fall back to regular CSS
      this.config.useHoudini = false;
      logger.warn('[HIGHLIGHT TYPE] Falling back to regular CSS for highlighting due to Paint Worklet registration failure.');
    }
  }
  
  /**
   * Create CSS styles for highlighting
   */
  private createHighlightStyles(): void {
    // Check if styles already exist
    if (document.getElementById('nova-reader-highlight-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'nova-reader-highlight-styles';
    
    if (this.config.useHoudini) {
      // Use CSS Paint API for highlighting
      style.textContent = `
        .nova-reader-word {
          transition: all ${this.config.transitionSpeed} ${this.config.easing};
          padding: 0;
          margin: 0;
          cursor: pointer;
          position: relative;
          display: inline;
          border-radius: 3px;
        }
        
        .nova-reader-word:hover {
          --highlight-color: ${this.config.highlightColor};
          --highlight-opacity: 0.25;
          --highlight-style: 'solid';
          --highlight-active: 'false';
          --highlight-border-radius: 3;
          background-image: paint(textHighlight);
        }
        
        .${this.highlightClassName} {
          --highlight-color: ${this.config.highlightColor};
          --highlight-opacity: ${this.config.highlightOpacity};
          --highlight-style: 'solid';
          --highlight-active: 'false';
          --highlight-border-radius: 4;
          background-image: paint(textHighlight);
          color: #000000;
          text-shadow: 0px 0px 1px rgba(255,255,255,0.5);
          transition: all ${this.config.transitionSpeed} ${this.config.easing};
          position: relative;
          padding: 0 2px;
          margin: 0 -1px; /* Negative margin to prevent gaps */
        }
        
        /* Current word highlight that appears on top of the sentence highlight */
        .${this.highlightClassName}-active {
          --highlight-color: ${this.config.activeHighlightColor};
          --highlight-opacity: ${this.config.activeHighlightOpacity};
          --highlight-style: 'glow';
          --highlight-active: 'true';
          --highlight-border-radius: 4;
          background-image: paint(textHighlight);
          color: #000000;
          text-shadow: 0px 0px 1px rgba(255,255,255,0.7);
          position: relative;
          z-index: 2;
          padding: 0 3px;
          margin: 0 -2px; /* Negative margin to prevent gaps */
          animation: nova-reader-pulse-houdini 1.5s ease-in-out infinite;
        }
        
        @keyframes nova-reader-pulse-houdini {
          0% { 
            --highlight-opacity: ${this.config.activeHighlightOpacity};
          }
          50% { 
            --highlight-opacity: ${this.config.activeHighlightOpacity + 0.1};
          }
          100% { 
            --highlight-opacity: ${this.config.activeHighlightOpacity};
          }
        }
        
        .nova-reader-wrapper {
          display: inline;
          position: relative;
        }
      `;
    } else {
      // Fallback to regular CSS for browsers without CSS Paint API support
      style.textContent = `
        .nova-reader-word {
          transition: all ${this.config.transitionSpeed} ${this.config.easing};
          padding: 0;
          margin: 0;
          cursor: pointer;
          position: relative;
          display: inline;
          border-radius: 3px;
        }
        
        .nova-reader-word:hover {
          background-color: ${this.config.highlightColor}40; /* 25% opacity */
        }
        
        .${this.highlightClassName} {
          background-color: ${this.config.highlightColor} !important;
          opacity: ${this.config.highlightOpacity};
          transition: all ${this.config.transitionSpeed} ${this.config.easing};
          box-shadow: 0 1px 3px rgba(0,0,0,0.07);
          border-radius: 4px;
          cursor: pointer;
          color: #000000; /* Ensuring text is black for contrast */
          text-shadow: 0px 0px 1px rgba(255,255,255,0.5); /* Adding subtle text shadow for readability */
          padding: 0 2px;
          margin: 0 -1px; /* Negative margin to prevent gaps */
        }
        
        /* Current word highlight that appears on top of the sentence highlight */
        .${this.highlightClassName}-active {
          background-color: ${this.config.activeHighlightColor} !important;
          opacity: ${this.config.activeHighlightOpacity};
          animation: nova-reader-pulse 1.5s ease-in-out infinite;
          box-shadow: 0 2px 8px rgba(90, 104, 227, 0.25);
          border-radius: 4px;
          position: relative;
          z-index: 2;
          color: #000000; /* Ensuring text is black for contrast */
          text-shadow: 0px 0px 1px rgba(255,255,255,0.7); /* Enhanced text shadow for better readability */
          padding: 0 3px;
          margin: 0 -2px; /* Negative margin to prevent gaps */
        }
        
        .nova-reader-wrapper {
          display: inline;
          position: relative;
        }
        
        @keyframes nova-reader-pulse {
          0% { 
            opacity: ${this.config.activeHighlightOpacity}; 
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(90, 104, 227, 0.25);
          }
          50% { 
            opacity: ${this.config.activeHighlightOpacity + 0.1}; 
            transform: scale(1.02);
            box-shadow: 0 3px 10px rgba(90, 104, 227, 0.35);
          }
          100% { 
            opacity: ${this.config.activeHighlightOpacity}; 
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(90, 104, 227, 0.25);
          }
        }
      `;
    }
    
    document.head.appendChild(style);
    logger.info(`[HIGHLIGHT TYPE] Highlight styles created using ${this.config.useHoudini ? 'CSS Paint API' : 'regular CSS'}`);
  }
  
  /**
   * Initialize the highlighter with selected text
   */
  public initialize(text: string): void {
    this.originalText = text;
    
    // Initialize StringTracker with the original text
    this.stringTracker = createStringTracker(text);
    
    // Try to find text on the page
    this.findTextOnPage();
    
    // Initialize the sentence highlighter with the same text elements
    this.sentenceHighlighter.initialize(this.textElements);
    
    logger.info(`Initialized with text length: ${text.length}`);
  }
  
  /**
   * Process SSML text to handle special characters and XML tags
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
    
    // Create a new string tracker to map between original SSML and plain text
    let tracker = createStringTracker(ssmlText);
    
    // Replace all entity references
    const entityRegex = /&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/g;
    let match;
    let offset = 0;
    
    // Create a temporary div to decode entities
    const div = document.createElement('div');
    
    while ((match = entityRegex.exec(ssmlText)) !== null) {
      // Get the entity's decoded value
      div.innerHTML = match[0];
      const decoded = div.textContent || '';
      
      // Remove the entity and add the decoded character
      tracker = tracker.remove(match.index - offset, match.index - offset + match[0].length);
      tracker = tracker.add(match.index - offset, decoded);
      
      // Adjust offset based on the difference in length
      offset += (match[0].length - decoded.length);
    }
    
    this.stringTracker = tracker;
    this.originalText = tracker.get();
    
    logger.info('Processed SSML text');
  }
  
  /**
   * Find text on the page and prepare elements for highlighting
   */
  private findTextOnPage(): void {
    // Clear any previous elements
    this.textElements = [];
    
    // First try to match the exact full text in a single element
    const fullTextElements = this.findElementsWithExactText(this.originalText);
    
    if (fullTextElements.length > 0) {
      // Use the first found element
      this.textElements = [fullTextElements[0]];
      logger.info('Found exact text match');
    } else {
      // If no exact match, try to find the text spread across multiple elements
      this.textElements = this.findElementsWithPartialText(this.originalText);
      logger.info(`Found partial text matches: ${this.textElements.length}`);
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
   * Wrap words in spans for highlighting with proper indexing using StringTracker
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
      let lastIndex = 0;
      
      // Identify sentence boundaries in the original text
      // This regex looks for sentence endings (period, question mark, exclamation mark followed by space or end)
      const sentenceBoundaries: number[] = [];
      const sentenceRegex = /[.!?](?:\s|$)/g;
      let sentenceMatch;
      let sentenceText = this.originalText;
      
      while ((sentenceMatch = sentenceRegex.exec(sentenceText)) !== null) {
        sentenceBoundaries.push(sentenceMatch.index + 1); // +1 to include the punctuation
      }
      
      // Add the end of text as a boundary if not already included
      if (sentenceBoundaries.length === 0 || sentenceBoundaries[sentenceBoundaries.length - 1] < sentenceText.length) {
        sentenceBoundaries.push(sentenceText.length);
      }
      
      // Track current sentence index
      let currentSentenceIndex = 0;
      
      while ((match = wordPattern.exec(content)) !== null) {
        const word = match[1]; // The word
        const space = match[2]; // The following space/whitespace
        
        // Find the word in the original text using StringTracker
        const wordIndex = this.originalText.indexOf(word, lastIndex);
        
        if (wordIndex !== -1) {
          // Store the last position we found a word at
          lastIndex = wordIndex + word.length;
          
          // Determine which sentence this word belongs to
          while (currentSentenceIndex < sentenceBoundaries.length && 
                 wordIndex + word.length > sentenceBoundaries[currentSentenceIndex]) {
            currentSentenceIndex++;
          }
          
          // Wrap the word in a span with data attributes for time mapping
          newContent += `<span class="nova-reader-word" data-original-index="${wordIndex}" data-sentence-index="${currentSentenceIndex}">${word}</span>${space}`;
        } else {
          // If word not found (rare case), just add it without wrapping
          newContent += `${word}${space}`;
        }
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
    
    logger.info('Words wrapped for highlighting');
  }
  
  /**
   * Handle click on a word to seek audio
   */
  private handleWordClick(wordElement: HTMLElement): void {
    // Remove isActive check to allow clicking even after playback has ended
    if (!this.speechMarks || !this.stringTracker) return;
    
    const originalIndex = parseInt(wordElement.getAttribute('data-original-index') || '0');
    
    // Find the corresponding chunk based on index
    if (this.speechMarks.chunks) {
      // Find the chunk whose start position is closest to the clicked word's index
      const chunk = this.findChunkByIndex(originalIndex);
      
      if (chunk) {
        logger.info(`Word clicked, seeking to ${chunk.start_time} ms`);
        
        // Use seekAndPlay instead of just seek to ensure playback resumes
        const seekTimeSeconds = chunk.start_time / 1000;
        this.audioPlayer.seekAndPlay(seekTimeSeconds);
      }
    }
  }
  
  /**
   * Find a chunk by its index, with proper handling of index gaps
   */
  private findChunkByIndex(index: number): Chunk | null {
    if (!this.speechMarks || !this.speechMarks.chunks) return null;
    
    // Handle the case according to the documentation:
    // "When looking for a word at a specific index, check for start being >= yourIndex
    // rather than checking if the index is within both start and end bounds"
    
    // First try to find a chunk that contains this index exactly
    let chunk = this.speechMarks.chunks.find(c => 
      index >= c.start && index < c.end
    );
    
    if (chunk) return chunk;
    
    // If no exact match, find the chunk with the closest start position >= index
    const chunksWithStartGte = this.speechMarks.chunks
      .filter(c => c.start >= index)
      .sort((a, b) => a.start - b.start);
    
    if (chunksWithStartGte.length > 0) {
      return chunksWithStartGte[0]; // Return the chunk with the closest start position
    }
    
    // If no chunks have start >= index, find the chunk with the closest start position
    return [...this.speechMarks.chunks]
      .sort((a, b) => Math.abs(a.start - index) - Math.abs(b.start - index))[0];
  }
  
  /**
   * Set speech marks data for highlighting
   */
  public setSpeechMarks(speechMarks: NestedChunk): void {
    this.speechMarks = speechMarks;
    logger.info(`Speech marks set: ${speechMarks.chunks ? speechMarks.chunks.length : 'No chunks'}`);
    
    // Map speech marks to wrapped words
    this.mapSpeechMarksToWords();
  }
  
  /**
   * Map speech marks timing data to wrapped word elements using StringTracker
   */
  private mapSpeechMarksToWords(): void {
    if (!this.speechMarks || !this.speechMarks.chunks || !this.stringTracker) return;
    
    this.textElements.forEach(element => {
      const wordElements = element.querySelectorAll('.nova-reader-word');
      
      wordElements.forEach(wordElement => {
        const originalIndex = parseInt(wordElement.getAttribute('data-original-index') || '0');
        
        // Find the corresponding chunk
        const chunk = this.findChunkByIndex(originalIndex);
        
        if (chunk) {
          wordElement.setAttribute('data-start-time', chunk.start_time.toString());
          wordElement.setAttribute('data-end-time', chunk.end_time.toString());
          wordElement.setAttribute('data-chunk-start', chunk.start.toString());
          wordElement.setAttribute('data-chunk-end', chunk.end.toString());
        }
      });
    });
    
    logger.info('Speech marks mapped to words');
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
    
    // Start sentence highlighting
    this.sentenceHighlighter.startHighlighting();
    
    // Log which highlighting method is being used
    logger.info(`[HIGHLIGHT TYPE] Started highlighting using ${this.config.useHoudini ? 'CSS Paint Worklet (Houdini)' : 'regular CSS'}`);
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
    
    // Stop sentence highlighting
    this.sentenceHighlighter.stopHighlighting();
    
    logger.info('Stopped highlighting');
  }
  
  /**
   * Pause highlighting, maintaining current highlights but stopping updates
   */
  public pauseHighlighting(): void {
    if (!this.isActive) return;
    
    // Set state to inactive to stop updates, but don't clear highlights
    this.isActive = false;
    
    // Restore original callback if it exists
    if (this.originalTimeUpdateCallback) {
      this.audioPlayer.setCallbacks({
        onTimeUpdate: this.originalTimeUpdateCallback
      });
    }
    
    // Don't clear highlights to maintain the current highlighting state
    
    // Pause sentence highlighter without clearing
    this.sentenceHighlighter.pauseHighlighting();
    
    logger.info('Paused highlighting - keeping current highlights');
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
    
    // Important: Following the documentation's advice about timing gaps
    
    // Sort chunks by start_time for binary search
    const sortedChunks = [...this.speechMarks.chunks].sort((a, b) => a.start_time - b.start_time);
    
    // Handle the case before any text is spoken
    if (currentTimeMs < sortedChunks[0].start_time) {
      return null;
    }
    
    // Check each chunk to find the current position
    let currentChunk = null;
    
    // First try to find the chunk that contains the current time exactly
    for (const chunk of sortedChunks) {
      if (currentTimeMs >= chunk.start_time && currentTimeMs <= chunk.end_time) {
        return chunk; // Exact match
      }
    }
    
    // If no exact match, find the last chunk that starts before the current time
    for (const chunk of sortedChunks) {
      if (chunk.start_time <= currentTimeMs) {
        currentChunk = chunk;
      } else {
        break; // Stop once we've gone past currentTimeMs
      }
    }
    
    // If we're in a gap between chunks, we might need to show the upcoming word instead
    if (currentChunk) {
      const currentIndex = sortedChunks.indexOf(currentChunk);
      if (currentIndex < sortedChunks.length - 1) {
        const nextChunk = sortedChunks[currentIndex + 1];
        // If we're in the gap but closer to the next chunk than the previous one
        if (nextChunk.start_time - currentTimeMs < currentTimeMs - currentChunk.end_time) {
          return nextChunk;
        }
      }
    }
    
    return currentChunk;
  }
  
  /**
   * Highlight the word at the current playback time
   */
  private highlightCurrentWord(currentTimeMs: number): void {
    if (!this.speechMarks || !this.speechMarks.chunks || !this.isActive || !this.stringTracker) return;
    
    // Clear existing highlights
    this.clearHighlights();
    
    // Find the current word based on time, handling gaps
    const currentChunk = this.findChunkAtTime(currentTimeMs);
    
    if (currentChunk) {
      let currentWordElement: HTMLElement | null = null;
      
      // Find the current word across all text elements
      for (const element of this.textElements) {
        const wordElements = Array.from(element.querySelectorAll('.nova-reader-word')) as HTMLElement[];
        
        // Find the current word
        for (const wordElement of wordElements) {
          const chunkStart = parseInt(wordElement.getAttribute('data-chunk-start') || '-1');
          const chunkEnd = parseInt(wordElement.getAttribute('data-chunk-end') || '-1');
          
          // If this word element corresponds to the current chunk
          if (chunkStart === currentChunk.start && chunkEnd === currentChunk.end) {
            currentWordElement = wordElement;
            break;
          }
        }
        
        if (currentWordElement) break;
      }
      
      // If we found the current word
      if (currentWordElement) {
        // Apply active highlight to the current word
        currentWordElement.classList.add(`${this.highlightClassName}-active`);
        this.highlightedElements.push(currentWordElement);
        
        // Scroll to the word if it's not visible
        this.scrollToElementIfNeeded(currentWordElement);
        
        // Highlight the sentence using the sentence highlighter
        this.sentenceHighlighter.highlightSentence(currentWordElement);
      }
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
    // Clear word highlights
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
    
    // Clear any remaining highlights
    this.clearHighlights();
    
    // Clean up sentence highlighter
    this.sentenceHighlighter.cleanup();
    
    // Remove processing classes
    this.textElements.forEach(element => {
      element.classList.remove('nova-reader-processed');
    });
    
    // Clean up wrapped words (restore original content)
    this.textElements.forEach(element => {
      // Simple approach: Replace with textContent
      const text = element.textContent || '';
      element.innerHTML = text;
    });
    
    logger.info('Cleaned up');
  }
  
  /**
   * Set highlight colors
   */
  public setHighlightColors(wordColor: string, sentenceColor: string): void {
    this.config.highlightColor = wordColor;
    this.createHighlightStyles(); // Recreate styles with new color
    
    // Update sentence highlighter color
    this.sentenceHighlighter.setHighlightColor(sentenceColor);
  }
}