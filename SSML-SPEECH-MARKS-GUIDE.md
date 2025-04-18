# NovaReader SSML Styling and Speech Marks Implementation Guide

This guide explains how to use the enhanced text-to-speech features in NovaReader, including SSML styling for voice emotion and text highlighting with speech marks for synchronization.

## Overview

NovaReader now supports two powerful features:

1. **SSML Voice Styling**: Add emotion and cadence to your text-to-speech with Speechify's `speechify:style` tag
2. **Text Highlighting with Speech Marks**: Synchronize text highlighting with audio playback using speech marks

## SSML Voice Styling

### What is SSML Styling?

SSML (Speech Synthesis Markup Language) allows you to control how text is spoken by adding XML-like tags. NovaReader now supports Speechify's extended SSML tags for emotion and cadence control:

```xml
<speak>
    <speechify:style emotion="cheerful" cadence="fast">
        This text will be spoken with a cheerful emotion and faster pace!
    </speechify:style>
</speak>
```

### Available Styles

#### Emotions
- `angry`: Sounds upset or annoyed
- `cheerful`: Sounds happy and positive
- `sad`: Sounds downcast or melancholy
- `terrified`: Sounds scared
- `relaxed`: Sounds calm and peaceful
- `fearful`: Sounds anxious
- `surprised`: Sounds astonished
- `calm`: Sounds serene
- `assertive`: Sounds confident and strong
- `energetic`: Sounds lively
- `warm`: Sounds friendly and inviting
- `direct`: Sounds straightforward
- `bright`: Sounds upbeat and light

#### Cadence (Speed)
- `slow`: Speaks at a slower pace
- `medium`: Default speaking pace
- `fast`: Speaks at a faster pace
- Percentage values: Like `+20%` or `-30%` for fine control

**Note**: Cadence requires the `simba-turbo` model, which is automatically selected when cadence is specified.

### How to Use SSML Styling

The new style selection UI allows you to easily choose emotions and cadence:

1. Click the new "Style" button in the player UI
2. Select an emotion from the dropdown (Cheerful, Calm, Sad, etc.)
3. Select a speed/cadence (Slow, Normal, Fast)
4. Close the style menu and play your text

The text will be spoken with the selected style automatically applied.

### Programmatic Usage

If you're integrating NovaReader into your own application:

```typescript
// Set SSML styling options in SidePlayer
const player = new SidePlayer();
player.setSSMLStyle({
  emotion: 'cheerful',
  cadence: 'fast'
});

// Then play text as normal
player.startPlayback('Your text here');
```

## Text Highlighting with Speech Marks

### What are Speech Marks?

Speech marks are metadata returned with audio synthesis that map text positions to audio timing. This allows precise synchronization between text and audio for features like:

- Text highlighting during playback
- Precise audio seeking by text position
- Improved text-audio synchronization

### Data Structure

Speech marks follow this structure:

```typescript
type Chunk = {
  start_time: number  // Time in milliseconds when this chunk starts in the audio
  end_time: number    // Time in milliseconds when this chunk ends in the audio
  start: number       // Character index where this chunk starts in the original text
  end: number         // Character index where this chunk ends in the original text
  value: string       // The text content of this chunk
}

type NestedChunk = Chunk & {
  chunks: Chunk[]     // Array of word-level chunks within this sentence/paragraph
}
```

### Implementation Details

The enhanced implementation handles several key challenges:

1. **SSML Escaping**: The StringTracker library properly maps between text with XML-escaped characters and display text
2. **Index Gaps**: Properly handles gaps in the `start` and `end` values of words
3. **Timing Gaps**: Correctly manages gaps in `start_time` and `end_time` during playback
4. **Initial/Trailing Silence**: Accounts for silence at the beginning and end of audio

### How to Use Text Highlighting

1. Enable highlighting by toggling the highlight button in the player UI
2. Play any text - words will automatically highlight in sync with the audio
3. Click on any word to jump to that point in the audio

### Programmatic Usage

If you're integrating NovaReader into your own application:

```typescript
import { SidePlayer } from './player/SidePlayer';
import { synthesizeWithSpeechMarks } from './speechifyApi';

const player = new SidePlayer();

// Enable highlighting
player.toggleHighlighting();

// Get audio and speech marks in one call
const { audio, speechMarks } = await synthesizeWithSpeechMarks({
  text: "Your text to be spoken",
  voiceId: "your-selected-voice-id",
  returnSpeechMarks: true
});

if (audio && speechMarks) {
  // Setup highlighting with speech marks
  player.setupHighlighting(text, speechMarks);
  
  // Play the audio
  player.playWithUrl(URL.createObjectURL(new Blob([audio], { type: 'audio/mpeg' })));
}
```

## Combining Both Features

For the best experience, use both SSML styling and text highlighting together:

```typescript
// 1. Set up SSML style
player.setSSMLStyle({
  emotion: 'cheerful',
  cadence: 'medium'
});

// 2. Enable highlighting
player.toggleHighlighting();

// 3. Get audio with speech marks and style
const { audio, speechMarks } = await synthesizeWithSpeechMarks({
  text: "Your text to be spoken",
  voiceId: "your-selected-voice-id",
  ssmlStyle: {
    emotion: 'cheerful',
    cadence: 'medium'
  },
  returnSpeechMarks: true
});

// 4. Set up highlighting and play
player.setupHighlighting(text, speechMarks);
player.playWithUrl(URL.createObjectURL(new Blob([audio], { type: 'audio/mpeg' })));
```

## Important Considerations

1. **Model Selection**:
   - For cadence control, use the `simba-turbo` model
   - Regular emotions work with any model

2. **Text Processing**:
   - When using SSML tags, ensure text is properly escaped
   - The StringTracker library handles mapping between SSML and display text

3. **Performance**:
   - For very long texts, speech marks can be substantial
   - Consider implementing pagination for better performance

4. **Browser Compatibility**:
   - Text highlighting should work in all modern browsers
   - MediaSource Extensions (MSE) are required for streaming playback

## Troubleshooting

If you encounter issues:

1. **Highlighting not syncing properly**:
   - Check that speech marks are correctly received from the API
   - Verify StringTracker is properly mapping text positions

2. **Style not applying**:
   - Ensure you're using `simba-turbo` model when using cadence options
   - Check that SSML is correctly formatted

3. **Audio playback issues**:
   - The implementation includes multiple fallbacks for different scenarios
   - Direct playback is used when streaming isn't available

## Further Reading

- [Speechify API Documentation](https://docs.speechify.com/)
- [SSML W3 Specification](https://www.w3.org/TR/speech-synthesis/)
- [StringTracker Library Documentation](https://github.com/SpeechifyInc/string-tracker)
