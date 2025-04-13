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

// Handle messages from content script or OAuth callback
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PLAYER_ACTION') {
    console.log('Background has received a message from side player:', request?.action);
  } else if (request.type === 'PANEL_ACTION') {
    console.log('Background has received a message from side panel:', request?.action);
  } else if (request.type === 'supabase:auth:callback') {
    // Handle OAuth callback
    console.log('Received authentication callback');
    
    // Store authentication data securely
    // Note: In production, you'd want to use a more secure method to store tokens
    chrome.storage.local.set({
      auth: {
        data: request.payload,
        timestamp: Date.now()
      }
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving auth data:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        console.log('Auth data saved successfully');
        sendResponse({ success: true });
        
        // Notify any open tabs that authentication is complete
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'AUTH_STATE_CHANGED',
                authState: 'SIGNED_IN'
              }).catch(err => {
                // Ignore errors for tabs that don't have listeners
                console.log('Could not send to tab:', tab.id);
              });
            }
          });
        });
      }
    });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

// Add listener for browser action click (extension icon)
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Toggle the side player
    chrome.tabs.sendMessage(tab.id, { action: 'toggleSidePlayer' });
  }
});

// Handle auth state changes (listener for Supabase events)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.type === 'supabase:auth:signout') {
    // Handle sign out
    chrome.storage.local.remove(['auth'], () => {
      // Notify any open tabs that authentication is complete
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'AUTH_STATE_CHANGED',
              authState: 'SIGNED_OUT'
            }).catch(err => {
              // Ignore errors for tabs that don't have listeners
              console.log('Could not send to tab:', tab.id);
            });
          }
        });
      });
    });
  }
});
