// Sentence Highlighter component for highlighting the entire sentence being played
import { createLogger } from '../../../utils/logger';

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
const logger = createLogger('SentenceHighlighter');

export class SentenceHighlighter {
  private textElements: HTMLElement[] = [];
  private highlightClassName: string = 'nova-reader-sentence-highlight';
  private highlightedElements: HTMLElement[] = [];
  private isActive: boolean = false;
  private isPaintWorkletRegistered: boolean = false;
  
  // Configuration
  private config = {
    highlightColor: '#d4d4d8',  // Zinc-200 color for sentence highlighting
    highlightOpacity: 0.5,      // Higher opacity for better visibility
    transitionSpeed: '0.3s',    // Slightly slower for smoother transitions
    useHoudini: false           // Flag to toggle between CSS Paint API and regular CSS
  };
  
  constructor() {
    // Try to detect if CSS Paint API is supported
    if (window.CSS && CSS.paintWorklet) {
      this.config.useHoudini = true;
      this.isPaintWorkletRegistered = true; // We assume it's registered in InlineTextHighlighter
      logger.info('[HIGHLIGHT TYPE] SentenceHighlighter: Using CSS Paint API for sentence highlighting.');
    } else {
      logger.warn('[HIGHLIGHT TYPE] SentenceHighlighter: CSS Paint API not supported. Using fallback CSS highlighting for sentences.');
    }
    
    // Create styles for highlighting
    this.createHighlightStyles();
  }
  
  /**
   * Create CSS styles for highlighting
   */
  private createHighlightStyles(): void {
    // Check if styles already exist
    if (document.getElementById('nova-reader-sentence-highlight-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'nova-reader-sentence-highlight-styles';
    
    if (this.config.useHoudini) {
      // Use CSS Paint API for highlighting
      style.textContent = `
        /* Sentence container with Paint API */
        .${this.highlightClassName}-container {
          --highlight-color: ${this.config.highlightColor};
          --highlight-opacity: ${this.config.highlightOpacity};
          --highlight-style: 'solid';
          --highlight-active: 'false';
          --highlight-border-radius: 3;
          display: inline;
          background-image: paint(textHighlight);
          padding: 0.1em 0; /* Reduced padding */
          margin: 0;
          position: relative;
          transition: all ${this.config.transitionSpeed} ease-out;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }
        
        /* Combined highlight group - this wraps the entire sentence */
        .${this.highlightClassName}-group {
          display: inline;
          position: relative;
          white-space: normal;
        }
        
        /* Fix for potential gaps in wrapped lines */
        .${this.highlightClassName}-word {
          position: relative;
          display: inline;
          white-space: pre-wrap; /* Preserve white space but allow wrapping */
        }
      `;
    } else {
      // Fallback to regular CSS for browsers without CSS Paint API support
      style.textContent = `
        /* Sentence container with continuous background */
        .${this.highlightClassName}-container {
          background-color: ${this.config.highlightColor};
          opacity: ${this.config.highlightOpacity};
          display: inline;
          border-radius: 3px;
          padding: 0.1em 0; /* Reduced padding */
          margin: 0;
          position: relative;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          transition: all ${this.config.transitionSpeed} ease-out;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        /* Combined highlight group - continuous across the sentence */
        .${this.highlightClassName}-group {
          display: inline;
          position: relative;
          white-space: normal;
        }
        
        /* For continuous background on multi-line sentences */
        .${this.highlightClassName}-word {
          position: relative;
          display: inline;
          white-space: pre-wrap; /* Preserve white space but allow wrapping */
          background-color: transparent !important; /* Force transparency to avoid double highlighting */
        }
      `;
    }
    
    document.head.appendChild(style);
    logger.info(`[HIGHLIGHT TYPE] SentenceHighlighter: Styles created using ${this.config.useHoudini ? 'CSS Paint API' : 'regular CSS'}`);
  }
  
  /**
   * Initialize the highlighter with text elements
   */
  public initialize(textElements: HTMLElement[]): void {
    this.textElements = textElements;
    logger.info(`Initialized with ${textElements.length} text elements`);
  }
  
  /**
   * Start highlighting
   */
  public startHighlighting(): void {
    this.isActive = true;
    logger.info(`[HIGHLIGHT TYPE] SentenceHighlighter: Started highlighting using ${this.config.useHoudini ? 'CSS Paint API' : 'regular CSS'}`);
  }
  
  /**
   * Stop highlighting
   */
  public stopHighlighting(): void {
    this.isActive = false;
    this.clearHighlights();
    logger.info('Stopped sentence highlighting');
  }
  
  /**
   * Pause highlighting without clearing highlights
   */
  public pauseHighlighting(): void {
    this.isActive = false;
    // Don't clear highlights to maintain the current state
    logger.info('Paused sentence highlighting - keeping current highlights');
  }
  
  /**
   * Highlight the sentence containing the current word
   */
  public highlightSentence(currentWordElement: HTMLElement | null): void {
    if (!this.isActive || !currentWordElement) return;
    
    // Clear existing highlights
    this.clearHighlights();
    
    // Get the sentence index from the current word
    const sentenceIndex = currentWordElement.getAttribute('data-sentence-index');
    if (!sentenceIndex) return;
    
    // Find all words in the same sentence across all text elements
    this.textElements.forEach(element => {
      const wordElements = Array.from(element.querySelectorAll('.nova-reader-word')) as HTMLElement[];
      
      // Create a continuous highlight for the sentence
      this.createSentenceHighlight(element, wordElements, sentenceIndex, currentWordElement);
    });
  }
  
  /**
   * Create a continuous highlight for the entire sentence
   */
  private createSentenceHighlight(
    container: HTMLElement, 
    wordElements: HTMLElement[], 
    sentenceIndex: string,
    currentWordElement: HTMLElement
  ): void {
    // First, remove any existing sentence containers and groups
    const existingContainers = container.querySelectorAll(
      `.${this.highlightClassName}-container, .${this.highlightClassName}-group`
    );
    existingContainers.forEach(el => {
      // Unwrap the container (move its children before it and remove it)
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    });
    
    // Get all words in the current sentence
    const sentenceWords = wordElements.filter(el => 
      el.getAttribute('data-sentence-index') === sentenceIndex
    );
    
    if (sentenceWords.length === 0) return;
    
    // Filter out the current word which will be highlighted separately
    const wordsToHighlight = sentenceWords.filter(word => word !== currentWordElement);
    
    if (wordsToHighlight.length === 0) return;
    
    // Sort words by their position in the DOM
    wordsToHighlight.sort((a, b) => {
      const position = a.compareDocumentPosition(b);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    
    // Group consecutive words to create continuous highlighting
    const wordGroups = this.groupConsecutiveWords(wordsToHighlight);
    
    // Create a wrapper for each group of consecutive words
    wordGroups.forEach(group => {
      if (group.length === 0) return;
      
      // We need to determine if these words are actually consecutive in the DOM
      // by checking their parent nodes and positions
      const firstWord = group[0];
      const lastWord = group[group.length - 1];
      
      // Create a container for this group
      const wrapper = document.createElement('span');
      wrapper.className = `${this.highlightClassName}-container`;
      
      // Mark all words in this group
      group.forEach(wordElement => {
        wordElement.classList.add(`${this.highlightClassName}-word`);
        this.highlightedElements.push(wordElement);
      });
      
      // If the group consists of a single word, we can simply wrap it
      if (group.length === 1) {
        this.wrapElement(group[0], wrapper);
        this.highlightedElements.push(wrapper);
        return;
      }
      
      // For consecutive words in the same parent, we can use a common wrapper
      if (this.areElementsConsecutive(group)) {
        // Get the text nodes between the first and last word
        const range = document.createRange();
        range.setStartBefore(firstWord);
        range.setEndAfter(lastWord);
        
        // Create a wrapper span for this group
        const groupWrapper = document.createElement('span');
        groupWrapper.className = `${this.highlightClassName}-group`;
        
        try {
          // Surround the range with our wrapper
          range.surroundContents(groupWrapper);
          
          // Apply the container class to the wrapper
          groupWrapper.classList.add(`${this.highlightClassName}-container`);
          
          // Track for cleanup
          this.highlightedElements.push(groupWrapper);
        } catch (e) {
          logger.warn(`[HIGHLIGHT] Failed to create continuous highlight: ${e}`);
          
          // Fallback: individually wrap words
          group.forEach(wordElement => {
            const singleWrapper = document.createElement('span');
            singleWrapper.className = `${this.highlightClassName}-container`;
            this.wrapElement(wordElement, singleWrapper);
            this.highlightedElements.push(singleWrapper);
          });
        }
      } else {
        // If words aren't consecutive in DOM, highlight them individually
        group.forEach(wordElement => {
          const singleWrapper = document.createElement('span');
          singleWrapper.className = `${this.highlightClassName}-container`;
          this.wrapElement(wordElement, singleWrapper);
          this.highlightedElements.push(singleWrapper);
        });
      }
    });
  }
  
  /**
   * Group arrays of words that are consecutive in the sentence
   */
  private groupConsecutiveWords(words: HTMLElement[]): HTMLElement[][] {
    if (words.length === 0) return [];
    
    const groups: HTMLElement[][] = [];
    let currentGroup: HTMLElement[] = [words[0]];
    
    for (let i = 1; i < words.length; i++) {
      const prevIndex = parseInt(words[i-1].getAttribute('data-original-index') || '0');
      const currentIndex = parseInt(words[i].getAttribute('data-original-index') || '0');
      
      // Check if words are consecutive in the text
      const prevText = words[i-1].textContent || '';
      const currentWordDistanceInText = currentIndex - (prevIndex + prevText.length);
      
      // If the gap is just whitespace (usually 1 character), treat as consecutive
      if (currentWordDistanceInText <= 2) {
        currentGroup.push(words[i]);
      } else {
        // Start a new group
        groups.push(currentGroup);
        currentGroup = [words[i]];
      }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }
  
  /**
   * Check if elements are consecutive siblings in the DOM
   */
  private areElementsConsecutive(elements: HTMLElement[]): boolean {
    if (elements.length <= 1) return true;
    
    // Check if all elements have the same parent
    const parent = elements[0].parentElement;
    if (!parent) return false;
    
    for (let i = 1; i < elements.length; i++) {
      if (elements[i].parentElement !== parent) return false;
    }
    
    // Check if they are consecutive siblings
    for (let i = 0; i < elements.length - 1; i++) {
      let nextSibling = elements[i].nextSibling;
      
      // Skip text nodes and comments
      while (nextSibling && 
             (nextSibling.nodeType === Node.TEXT_NODE || 
              nextSibling.nodeType === Node.COMMENT_NODE)) {
        nextSibling = nextSibling.nextSibling;
      }
      
      if (nextSibling !== elements[i+1]) return false;
    }
    
    return true;
  }
  
  /**
   * Wrap an element with a wrapper
   */
  private wrapElement(element: HTMLElement, wrapper: HTMLElement): void {
    if (!element.parentNode) return;
    
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
  }
  
  /**
   * Clear all highlights
   */
  public clearHighlights(): void {
    try {
      // Clear sentence highlights - reset styles
      this.highlightedElements.forEach(element => {
        if (!element || !element.parentNode) return;
        
        // Check if it's a container or wrapper
        if (element.classList.contains(`${this.highlightClassName}-container`) || 
            element.classList.contains(`${this.highlightClassName}-group`)) {
          // Unwrap: move all children out of the container and remove it
          const parent = element.parentNode;
          if (parent) {
            while (element.firstChild) {
              parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
          }
        } else {
          // It's a word element, just remove classes
          element.classList.remove(`${this.highlightClassName}-word`);
          element.classList.remove(`${this.highlightClassName}-word-start`);
          element.classList.remove(`${this.highlightClassName}-word-end`);
          
          // Reset any styles we applied
          element.style.position = '';
          element.style.display = '';
          element.style.whiteSpace = '';
        }
      });
      
      // Also remove any containers or groups that might still exist
      const containers = document.querySelectorAll(
        `.${this.highlightClassName}-container, .${this.highlightClassName}-group`
      );
      
      containers.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
        }
      });
    } catch (error) {
      logger.error(`Error clearing highlights: ${error}`);
    }
    
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
    
    logger.info('Cleaned up sentence highlighter');
  }
  
  /**
   * Set highlight color
   */
  public setHighlightColor(color: string): void {
    this.config.highlightColor = color;
    this.createHighlightStyles(); // Recreate styles with new color
  }
}