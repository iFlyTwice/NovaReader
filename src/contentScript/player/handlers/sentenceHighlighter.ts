// Sentence Highlighter component for highlighting the entire sentence being played
import { createLogger } from '../../../utils/logger';

// Create a logger instance for this module
const logger = createLogger('SentenceHighlighter');

export class SentenceHighlighter {
  private textElements: HTMLElement[] = [];
  private highlightClassName: string = 'nova-reader-sentence-highlight';
  private highlightedElements: HTMLElement[] = [];
  private isActive: boolean = false;
  
  // Configuration
  private config = {
    highlightColor: '#d4d4d8',  // Lighter zinc color (zinc-200) for sentence highlighting
    transitionSpeed: '0.3s',    // Slightly slower for smoother transitions
  };
  
  constructor() {
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
    style.textContent = `
      /* Sentence container - this is the key to continuous highlighting */
      .${this.highlightClassName}-container {
        background-color: ${this.config.highlightColor};
        display: inline;
        padding: 2px 4px;
        margin: 0;
        border-radius: 3px;
        position: relative;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        transition: all ${this.config.transitionSpeed} ease-out;
      }
      
      .${this.highlightClassName}-word {
        background-color: ${this.config.highlightColor};
        border-radius: 0;
        padding: 2px 0;
        box-shadow: 0 0 0 2px ${this.config.highlightColor};
        transition: all ${this.config.transitionSpeed} ease-out;
      }
      
      .${this.highlightClassName}-word-start {
        border-top-left-radius: 3px;
        border-bottom-left-radius: 3px;
        padding-left: 4px;
      }
      
      .${this.highlightClassName}-word-end {
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
        padding-right: 4px;
      }
    `;
    
    document.head.appendChild(style);
    logger.info('Sentence highlight styles created');
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
    logger.info('Started sentence highlighting');
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
    // First, remove any existing sentence containers
    const existingContainers = container.querySelectorAll(`.${this.highlightClassName}-container`);
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
    
    // Sort words by their position in the DOM
    sentenceWords.sort((a, b) => {
      const position = a.compareDocumentPosition(b);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    
    // Apply the highlight to all words in the sentence except the current word
    for (const wordElement of sentenceWords) {
      if (wordElement !== currentWordElement) {
        // Apply a continuous background color
        wordElement.classList.add(`${this.highlightClassName}-word`);
        
        // Track this for cleanup
        this.highlightedElements.push(wordElement);
      }
    }
    
    // Add special classes for first and last words in the sentence
    const wordsExcludingCurrent = sentenceWords.filter(word => word !== currentWordElement);
    
    if (wordsExcludingCurrent.length > 0) {
      // Sort by DOM position
      wordsExcludingCurrent.sort((a, b) => {
        const position = a.compareDocumentPosition(b);
        return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
      
      const firstWord = wordsExcludingCurrent[0];
      const lastWord = wordsExcludingCurrent[wordsExcludingCurrent.length - 1];
      
      if (firstWord) {
        firstWord.classList.add(`${this.highlightClassName}-word-start`);
      }
      
      if (lastWord && lastWord !== firstWord) {
        lastWord.classList.add(`${this.highlightClassName}-word-end`);
      }
      
      // Create a special wrapper for the entire sentence if needed
      if (wordsExcludingCurrent.length > 1) {
        // Create a wrapper that spans from the first to the last word
        const wrapper = document.createElement('span');
        wrapper.className = `${this.highlightClassName}-container`;
        
        // Position the wrapper relative to the first word
        firstWord.style.position = 'relative';
        
        // Track this for cleanup
        this.highlightedElements.push(wrapper);
      }
    }
  }
  
  /**
   * Clear all highlights
   */
  public clearHighlights(): void {
    // Clear sentence highlights - reset styles
    this.highlightedElements.forEach(element => {
      // Remove all classes we added
      element.classList.remove(`${this.highlightClassName}-word`);
      element.classList.remove(`${this.highlightClassName}-word-start`);
      element.classList.remove(`${this.highlightClassName}-word-end`);
      
      // Reset any styles we applied
      element.style.position = '';
    });
    
    // Also remove any containers that might still exist
    const containers = document.querySelectorAll(`.${this.highlightClassName}-container`);
    containers.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
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