import { ELEVENLABS_API_KEY, DEFAULT_VOICE_ID } from '../config';

console.log('Background script is running');

// When extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated');
  
  if (!ELEVENLABS_API_KEY) {
    console.error('ERROR: No API key found in config! The extension will not work properly.');
  } else {
    console.log('API key found in config, length:', ELEVENLABS_API_KEY.length);
  }
  
  // Save API key to storage immediately
  chrome.storage.local.set({ 
    apiKey: ELEVENLABS_API_KEY,
    selectedVoiceId: DEFAULT_VOICE_ID
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving API key to storage:', chrome.runtime.lastError);
    } else {
      console.log('API key and default voice saved to storage successfully');
    }
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PLAYER_ACTION') {
    console.log('Background has received a message from side player:', request?.action);
  } else if (request.type === 'PANEL_ACTION') {
    console.log('Background has received a message from side panel:', request?.action);
  }
});

// Add listener for browser action click (extension icon)
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Toggle the side player
    chrome.tabs.sendMessage(tab.id, { action: 'toggleSidePlayer' });
  }
});
