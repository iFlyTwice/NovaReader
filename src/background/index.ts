console.log('Background script is running');

// When extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated');
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
