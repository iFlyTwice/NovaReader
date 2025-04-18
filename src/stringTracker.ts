/**
 * Simple StringTracker implementation for NovaReader
 * Based on the documentation: https://github.com/SpeechifyInc/string-tracker
 */

// Enum for string operations
export enum StringOp {
  Add = 'add',
  Remove = 'remove',
  Regular = 'regular'
}

// Type for change operations
export type Change = string | [StringOp, string];

// Main StringTracker class
export class StringTracker {
  private originalText: string;
  private modifiedText: string;
  private changes: Change[] = [];
  
  constructor(originalText: string, modifiedText?: string, changes?: Change[]) {
    this.originalText = originalText;
    this.modifiedText = modifiedText || originalText;
    this.changes = changes || [originalText];
  }
  
  /**
   * Creates a new StringTracker with added text at the specified index
   */
  public add(index: number, text: string): StringTracker {
    // Create a new modified text
    const newModifiedText = this.modifiedText.substring(0, index) + text + this.modifiedText.substring(index);
    
    // Return a new StringTracker with the modified text
    return new StringTracker(this.originalText, newModifiedText);
  }
  
  /**
   * Creates a new StringTracker with a portion of text removed
   */
  public remove(startIndex: number, endIndex: number): StringTracker {
    if (startIndex >= endIndex) return this;
    
    // Create a new modified text
    const newModifiedText = this.modifiedText.substring(0, startIndex) + this.modifiedText.substring(endIndex);
    
    // Return a new StringTracker with the modified text
    return new StringTracker(this.originalText, newModifiedText);
  }
  
  /**
   * Get the current text
   */
  public get(): string {
    return this.modifiedText;
  }
  
  /**
   * Get the original text
   */
  public getOriginal(): string {
    return this.originalText;
  }
  
  /**
   * Map an index from the modified text back to the original text
   */
  public mapToOriginal(index: number): number {
    // Simple implementation - for a more complex implementation,
    // we would need to track all changes and map indices accordingly
    if (index >= this.modifiedText.length) {
      return this.originalText.length;
    }
    
    // For now, just return the same index if it's within bounds
    return Math.min(index, this.originalText.length);
  }
  
  /**
   * Map an index from the original text to the modified text
   */
  public mapFromOriginal(index: number): number {
    // Simple implementation - for a more complex implementation,
    // we would need to track all changes and map indices accordingly
    if (index >= this.originalText.length) {
      return this.modifiedText.length;
    }
    
    // For now, just return the same index if it's within bounds
    return Math.min(index, this.modifiedText.length);
  }
}

/**
 * Create a new StringTracker instance
 */
export function createStringTracker(text: string): StringTracker {
  return new StringTracker(text);
}
