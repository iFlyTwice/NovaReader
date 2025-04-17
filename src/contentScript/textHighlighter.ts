/**
 * Text Highlighter for NovaReader
 * Handles real-time highlighting of text as it's being spoken
 */

export interface AlignmentWord {
  word: string;
  start: number;  // Start time in seconds
  end: number;    // End time in seconds
}

export class TextHighlighter {
  private container: HTMLElement;
  private originalText: string;
  private words: AlignmentWord[] = [];
  private wordElements: HTMLElement[] = [];
  private currentWordIndex: number = -1;
  private highlightColor: string = '#ffeb3b7d'; // Light yellow with transparency
  
  constructor(container: HTMLElement, text: string) {
    this.container = container;
    this.originalText = text;
    
    // Initialize with plain text
    this.container.textContent = text;
  }
  
  /**
   * Add new words with timing information and update the display
   */
  public addWords(newWords: AlignmentWord[]): void {
    if (!newWords.length) return;
    
    // Add the new words to our collection
    const startingIndex = this.words.length;
    this.words.push(...newWords);
    
    // Clear existing content if this is the first batch
    if (startingIndex === 0) {
      this.container.innerHTML = '';
    }
    
    // Create elements for the new words
    newWords.forEach((word, index) => {
      const wordElement = document.createElement('span');
      wordElement.classList.add('highlight-word');
      wordElement.textContent = word.word;
      wordElement.dataset.wordIndex = (startingIndex + index).toString();
      wordElement.dataset.startTime = word.start.toString();
