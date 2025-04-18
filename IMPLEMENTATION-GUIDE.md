# NovaReader Text Highlighting Implementation Guide

This guide explains how to use the improved text highlighting implementations that utilize the StringTracker library for accurate synchronization between text and audio.

## Overview

The text highlighting feature in NovaReader has been updated to use the StringTracker library, which properly handles the mapping between speech marks positions and displayed text positions. This addresses several key issues:

1. **SSML Escaping**: Properly handles special characters in the text that are returned in escaped form
2. **Index Gaps**: Handles gaps in the `start` and `end` values of words as described in the documentation
3. **Timing Gaps**: Properly manages gaps in `start_time` and `end_time` values
4. **StringTracker Integration**: Uses the StringTracker library for accurate position mapping

## Implementation Files

The following files have been updated:

- `textHighlighter.ts` - For highlighting text in a dedicated container
- `inlineTextHighlighter.ts` - For highlighting text directly on the webpage
- `audioPlayer.ts` - Added `seek` method to support clicking on words to jump to that point in audio

## How It Works

### 1. StringTracker Initialization

When text is loaded into the highlighter, a StringTracker instance is created:

```typescript
// In initialize method
this.stringTracker = createStringTracker(text);
```

### 2. SSML Processing

Special handling is added for SSML content, which is common in text-to-speech:

```typescript
// Process SSML text to handle special characters and XML tags
public processSsmlText(ssmlText: string): void {
  // Create a new string tracker to map between original SSML and display text
  this.stringTracker = createStringTracker(ssmlText);
  
  // Add operations to transform SSML to plain text
  // Replace entity references, remove tags, etc.
  // ...
  
  // Update display text
  this.displayText = this.stringTracker.get();
}
```

### 3. Finding Words by Time or Position

Improved algorithms for finding words based on time or position:

```typescript
// Find the correct chunk for the current time, handling gaps properly
private findChunkAtTime(currentTimeMs: number): Chunk | null {
  // Implementation follows the documentation's advice:
  // When looking for a word at a specific time, handle gaps between start_time and end_time
  // ...
}

// Find a chunk by its index, handling index gaps
private findChunkByIndex(index: number): Chunk | null {
  // Implementation follows the documentation's advice:
  // "When looking for a word at a specific index, check for start being >= yourIndex
  // rather than checking if the index is within both start and end bounds"
  // ...
}
```

### 4. Proper Rendering with Mapped Indices

When rendering text, StringTracker is used to map between original and display indices:

```typescript
// Map the original index to the display index using StringTracker
const mappedStart = this.stringTracker.getIndexOnModified(chunk.start);
const mappedEnd = this.stringTracker.getIndexOnModified(chunk.end);

// Create span for this chunk with both original and mapped indices
const span = document.createElement('span');
span.textContent = this.displayText.substring(mappedStart, mappedEnd);
span.dataset.textStart = chunk.start.toString();
span.dataset.textEnd = chunk.end.toString();
span.dataset.mappedStart = mappedStart.toString();
span.dataset.mappedEnd = mappedEnd.toString();
```

### 5. Highlighting During Playback

During playback, the current time is used to find and highlight the appropriate word:

```typescript
// Find the current word based on time, handling gaps
const currentWord = this.findChunkAtTime(currentTimeMs);

if (currentWord) {
  // Map the original index to the display index using StringTracker
  const mappedStart = this.stringTracker.getIndexOnModified(currentWord.start);
  const mappedEnd = this.stringTracker.getIndexOnModified(currentWord.end);
  
  // Find and highlight the span for this word
  // ...
}
```

### 6. Seeking Audio When Clicking Words

When a word is clicked, the audio player seeks to the corresponding time:

```typescript
// Handle clicks on words to jump to that point in the audio
private handleWordClick(chunk: Chunk): void {
  // Seek to the start time of this chunk
  const seekTimeSeconds = chunk.start_time / 1000;
  this.audioPlayer.seek(seekTimeSeconds);
}
```

## Usage in Your Application

### 1. Basic Implementation

For basic text highlighting in a container:

```typescript
import { TextHighlighter } from './handlers/textHighlighter';

// Create a text highlighter instance
const textHighlighter = new TextHighlighter(audioPlayer);

// Initialize with text and container
textHighlighter.initialize(text, container);

// If the text contains SSML, process it
if (text.includes('<') || text.includes('&')) {
  textHighlighter.processSsmlText(text);
}

// Set speech marks and start highlighting
textHighlighter.setSpeechMarks(speechMarks);
textHighlighter.startHighlighting();
```

### 2. Inline Text Highlighting

For highlighting text directly on the webpage:

```typescript
import { InlineTextHighlighter } from './handlers/inlineTextHighlighter';

// Create an inline text highlighter instance
const inlineHighlighter = new InlineTextHighlighter(audioPlayer);

// Initialize with text
inlineHighlighter.initialize(text);

// If the text contains SSML, process it
if (text.includes('<') || text.includes('&')) {
  inlineHighlighter.processSsmlText(text);
}

// Set speech marks and start highlighting
inlineHighlighter.setSpeechMarks(speechMarks);
inlineHighlighter.startHighlighting();
```

### 3. Integration with SidePlayer

Update your SidePlayer to use the improved highlighters:

```typescript
// In SidePlayer.ts
import { TextHighlighter } from './handlers/textHighlighter';

class SidePlayer {
  // ...
  
  setupHighlighting(text: string, speechMarks: NestedChunk): void {
    // Initialize the text highlighter
    this.textHighlighter.initialize(text, this.playerElement);
    
    // Process any SSML in the text if needed
    if (text.includes('<') || text.includes('&')) {
      this.textHighlighter.processSsmlText(text);
    }
    
    // Set the speech marks and start highlighting
    this.textHighlighter.setSpeechMarks(speechMarks);
    this.textHighlighter.startHighlighting();
  }
  
  // ...
}
```

## Testing

To verify that the text highlighting is working correctly:

1. Check that words highlight in sync with audio playback
2. Verify that clicking on words correctly seeks the audio
3. Test with different types of content, including text with special characters
4. Verify that it works correctly with different voices and speech rates

## Troubleshooting

If you encounter issues:

1. **Words not highlighting**: Check that speech marks are being generated and set correctly
2. **Highlighting wrong words**: Verify SSML processing and StringTracker mapping
3. **Seeking not working**: Ensure the AudioPlayer's seek method is being called correctly
4. **Gaps in highlighting**: This is expected behavior as mentioned in the documentation about timing gaps

## Advanced Usage

For more advanced usage of the StringTracker library, refer to its documentation at `C:\Users\spenc\OneDrive\Documents\NovaReader\string-tracker-1.4.2\README.md`.
