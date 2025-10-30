// background.js - Service worker for Chrome extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ReadBuddy installed! Setting up...');
    
    // Set default settings
    chrome.storage.sync.set({
      speechRate: 1.0,
      autoSpeak: true
    });
    
    // Open welcome page
    chrome.tabs.create({
      url: 'https://www.example.com' // Replace with your welcome page
    });
  } else if (details.reason === 'update') {
    console.log('ReadBuddy updated to version', chrome.runtime.getManifest().version);
  }
});

// Handle keyboard shortcut (if defined in manifest)
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'toggle-screen-reader') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
      }
    });
  }
});

// Keep service worker alive
let keepAlive;
function startKeepAlive() {
  if (keepAlive) return;
  keepAlive = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // Just checking if runtime is still alive
    });
  }, 25000); // Every 25 seconds
}

startKeepAlive();

console.log('ReadBuddy background service worker loaded');