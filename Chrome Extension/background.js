// background.js - FIXED: Better error messages and recovery

// State management for continuous mode
const continuousModeState = new Map(); // tabId -> config
const screenReaderState = new Map(); // tabId -> boolean

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ReadBuddy v4.1.2 installed! Setting up...');
    
    chrome.storage.sync.set({
      speechRate: 1.0,
      autoSpeak: true,
      monitoringInterval: 10000,
      monitorVideos: true,
      monitorPage: true,
      bubbleEnabled: true,
      bubblePosition: { x: 0, y: 0 }
    });
    
    chrome.tabs.create({
      url: 'https://www.youtube.com'
    });
  } else if (details.reason === 'update') {
    console.log('ReadBuddy updated to version', chrome.runtime.getManifest().version);
  }
});

// Handle messages from popup, content scripts, and bubble
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action, 'from tab:', sender.tab?.id);

  // ============ BUBBLE BUTTON ACTIONS ============
  if (request.action === 'analyzeAndSpeak') {
    handleAnalyzeAndSpeak(sender.tab.id)
      .then(() => sendResponse({ success: true }))
      .catch(err => {
        console.error('Analysis failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  else if (request.action === 'toggleContinuousMode') {
    const tabId = sender.tab.id;
    const isActive = continuousModeState.has(tabId);
    
    if (isActive) {
      stopContinuousMode(tabId);
      sendResponse({ isActive: false });
    } else {
      // Get settings and start
      chrome.storage.sync.get(['monitoringInterval', 'monitorVideos', 'monitorPage', 'speechRate'], (settings) => {
        const config = {
          interval: settings.monitoringInterval || 10000,
          monitorVideos: settings.monitorVideos !== false,
          monitorPage: settings.monitorPage !== false,
          speechRate: settings.speechRate || 1.0
        };
        
        startContinuousMode(tabId, config)
          .then(() => sendResponse({ isActive: true }))
          .catch(err => sendResponse({ isActive: false, error: err.message }));
      });
    }
    return true;
  }

  else if (request.action === 'toggleScreenReader') {
    const tabId = sender.tab.id;
    const isActive = !screenReaderState.get(tabId);
    screenReaderState.set(tabId, isActive);
    
    chrome.tabs.sendMessage(tabId, {
      action: 'toggle',
      isActive: isActive
    }).then(() => {
      sendResponse({ isActive: isActive });
    }).catch(err => {
      sendResponse({ isActive: false, error: err.message });
    });
    return true;
  }

  else if (request.action === 'speak') {
    speakText(request.text, request.rate || 1.0);
    sendResponse({ success: true });
    return true;
  }

  else if (request.action === 'stopSpeaking') {
    chrome.tts.stop();
    sendResponse({ success: true });
    return true;
  }

  else if (request.action === 'getPageContent') {
    // This will be handled by content script, just acknowledge
    sendResponse({ success: true });
    return true;
  }

  // ============ CONTINUOUS MODE ACTIONS (EXISTING) ============
  else if (request.action === 'startContinuousMode') {
    startContinuousMode(request.tabId, request.config)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  else if (request.action === 'stopContinuousMode') {
    stopContinuousMode(request.tabId);
    sendResponse({ success: true });
    return true;
  }
  
  else if (request.action === 'getContinuousModeStatus') {
    const state = continuousModeState.get(request.tabId);
    sendResponse({ active: !!state, config: state });
    return true;
  }
  
  else if (request.action === 'continuousCheckComplete') {
    // Forward results to popup if open
    chrome.runtime.sendMessage({
      action: 'continuousResults',
      data: request.data
    }).catch(() => {
      // Popup might be closed, that's okay
    });
    
    // Notify bubble about completion
    chrome.tabs.sendMessage(request.tabId || sender.tab?.id, {
      action: 'bubbleStatusUpdate',
      status: 'Check complete',
      data: request.data
    }).catch(() => {
      // Bubble might not be active
    });
    
    // Update status
    const state = continuousModeState.get(request.tabId);
    if (state) {
      updatePopupStatus(request.tabId, 'Monitoring active', state.interval);
    }
    
    sendResponse({ success: true });
    return true;
  }
  
  else if (request.action === 'toggle') {
    // Forward to content script
    chrome.tabs.sendMessage(sender.tab.id, { action: 'toggle' });
    sendResponse({ success: true });
    return true;
  }

  // ============ GET STATES ============
  else if (request.action === 'getStates') {
    const tabId = sender.tab.id;
    sendResponse({
      continuousMode: continuousModeState.has(tabId),
      screenReader: screenReaderState.get(tabId) || false
    });
    return true;
  }
});

// ============ ANALYZE AND SPEAK (FOR BUBBLE) ============
async function handleAnalyzeAndSpeak(tabId) {
  try {
    console.log(`📝 Analyzing page for tab ${tabId}`);
    
    // Notify bubble we're starting
    chrome.tabs.sendMessage(tabId, {
      action: 'bubbleStatusUpdate',
      status: 'Analyzing page...'
    }).catch(() => {});

    // Get page content from content script
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'getPageContent'
    });

    if (!response || !response.success) {
      throw new Error('Failed to get page content');
    }

    const pageData = response.data;

    // Send to backend for analysis
    const backendResponse = await fetch('http://127.0.0.1:8000/analyze-page', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pageData)
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const analysis = await backendResponse.json();

    // Get speech settings
    const settings = await chrome.storage.sync.get(['speechRate', 'autoSpeak']);
    const speechRate = settings.speechRate || 1.0;
    const autoSpeak = settings.autoSpeak !== false;

    // Notify bubble about results
    await chrome.tabs.sendMessage(tabId, {
      action: 'bubbleStatusUpdate',
      status: 'Analysis complete',
      data: analysis
    }).catch(() => {});

    // Speak if auto-speak is enabled
    if (autoSpeak) {
      const textToSpeak = formatAnalysisForSpeech(analysis);
      speakText(textToSpeak, speechRate);
    }

    return analysis;
  } catch (error) {
    console.error('Error in handleAnalyzeAndSpeak:', error);
    
    // Notify bubble about error
    chrome.tabs.sendMessage(tabId, {
      action: 'bubbleStatusUpdate',
      status: 'Error: ' + error.message
    }).catch(() => {});
    
    throw error;
  }
}

// Format analysis for speech
function formatAnalysisForSpeech(analysis) {
  let speech = [];

  // Handle new format with summaries array
  if (analysis.summaries && analysis.summaries.length > 0) {
    speech.push('Page summary: ' + analysis.summaries.join('. '));
  }

  if (analysis.image_descriptions && analysis.image_descriptions.length > 0) {
    const validImages = analysis.image_descriptions.filter(desc => 
      (typeof desc === 'string' && !desc.includes('No valid')) ||
      (typeof desc === 'object' && desc.caption)
    );
    
    if (validImages.length > 0) {
      speech.push('Images found: ' + validImages.length);
      validImages.slice(0, 3).forEach((desc, i) => {
        const caption = typeof desc === 'string' ? desc : desc.caption;
        speech.push(`Image ${i + 1}: ${caption}`);
      });
    }
  }

  if (analysis.video_descriptions && analysis.video_descriptions.length > 0) {
    const validVideos = analysis.video_descriptions.filter(v => v.type !== 'none');
    if (validVideos.length > 0) {
      speech.push('Videos found: ' + validVideos.length);
      validVideos.forEach((video, i) => {
        if (video.description) {
          speech.push(`Video ${i + 1}: ${video.description}`);
        }
      });
    }
  }

  return speech.join('. ');
}

// Text-to-speech function
function speakText(text, rate = 1.0) {
  chrome.tts.speak(text, {
    rate: rate,
    pitch: 1.0,
    volume: 1.0
  });
}

// ============ CONTINUOUS MODE FUNCTIONS (FIXED ERROR MESSAGES) ============
async function startContinuousMode(tabId, config) {
  console.log(`Starting continuous mode for tab ${tabId}`, config);
  
  // Store state FIRST (before any potential failures)
  continuousModeState.set(tabId, {
    interval: config.interval,
    monitorVideos: config.monitorVideos,
    monitorPage: config.monitorPage,
    speechRate: config.speechRate,
    lastCheck: Date.now(),
    alarmName: `continuousCheck_${tabId}`
  });
  
  // Send initial command to content script
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'initContinuousMode',
      config: config
    });
    
    if (response && !response.success) {
      continuousModeState.delete(tabId);
      
      // IMPROVED ERROR MESSAGES
      let userMessage = getUserFriendlyError(response.error);
      
      throw new Error(userMessage);
    }
    
    // Create alarm AFTER successful initialization
    const alarmName = `continuousCheck_${tabId}`;
    await chrome.alarms.create(alarmName, {
      delayInMinutes: config.interval / 60000,
      periodInMinutes: config.interval / 60000
    });
    
    console.log(`✅ Alarm created: ${alarmName} with interval ${config.interval}ms`);
    
    // Notify bubble
    chrome.tabs.sendMessage(tabId, {
      action: 'bubbleStatusUpdate',
      status: 'Monitoring started',
      continuousMode: true
    }).catch(() => {});
    
    // Perform first check immediately
    setTimeout(() => performCheck(tabId), 1000);
    
    updatePopupStatus(tabId, 'Monitoring started', config.interval);
    
  } catch (err) {
    console.error('❌ Error starting continuous mode:', err);
    continuousModeState.delete(tabId);
    
    // Get user-friendly error message
    let userMessage = getUserFriendlyError(err.message);
    
    // Notify bubble of error
    chrome.tabs.sendMessage(tabId, {
      action: 'bubbleStatusUpdate',
      status: 'Error: ' + userMessage
    }).catch(() => {});
    
    throw new Error(userMessage);
  }
}

// IMPROVED: Convert technical errors to user-friendly messages
function getUserFriendlyError(errorMessage) {
  if (!errorMessage) {
    return 'Unknown error occurred. Please try again.';
  }
  
  const msg = errorMessage.toLowerCase();
  
  if (msg.includes('could not establish connection') || msg.includes('receiving end does not exist')) {
    return 'Could not communicate with page. Please refresh the page and wait 5 seconds before trying again.';
  }
  
  if (msg.includes('dependencies not ready') || msg.includes('failed to load')) {
    return 'Extension components still loading. Please wait 5 seconds and try again. If problem persists, refresh the page.';
  }
  
  if (msg.includes('frameprocessor')) {
    return 'Video analysis component missing. Please reload the extension or refresh the page.';
  }
  
  if (msg.includes('pagechangedetector')) {
    return 'Page monitoring component missing. Please reload the extension or refresh the page.';
  }
  
  if (msg.includes('videomonitor')) {
    return 'Video detector component missing. Please reload the extension or refresh the page.';
  }
  
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Components took too long to load. Please refresh the page and wait 10 seconds before trying continuous mode.';
  }
  
  if (msg.includes('backend') || msg.includes('fetch') || msg.includes('network')) {
    return 'Cannot connect to backend server. Make sure it\'s running on http://127.0.0.1:8000';
  }
  
  // Return original message if no pattern matches
  return errorMessage;
}

function stopContinuousMode(tabId) {
  console.log(`Stopping continuous mode for tab ${tabId}`);
  
  const state = continuousModeState.get(tabId);
  if (!state) return;
  
  // Clear alarm
  chrome.alarms.clear(state.alarmName);
  
  // Remove state
  continuousModeState.delete(tabId);
  
  // Notify content script
  chrome.tabs.sendMessage(tabId, {
    action: 'stopContinuousMode'
  }).catch(() => {
    // Tab might be closed
  });

  // Notify bubble
  chrome.tabs.sendMessage(tabId, {
    action: 'bubbleStatusUpdate',
    status: 'Monitoring stopped',
    continuousMode: false
  }).catch(() => {});
  
  updatePopupStatus(tabId, 'Monitoring stopped');
}

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('⏰ Alarm fired:', alarm.name);
  
  const match = alarm.name.match(/continuousCheck_(\d+)/);
  if (match) {
    const tabId = parseInt(match[1]);
    performCheck(tabId);
  }
});

function performCheck(tabId) {
  const state = continuousModeState.get(tabId);
  if (!state) {
    console.log(`No state found for tab ${tabId}, skipping check`);
    return;
  }
  
  console.log(`🔍 Performing check for tab ${tabId}`);
  
  // Update last check time
  state.lastCheck = Date.now();
  
  // Notify bubble
  chrome.tabs.sendMessage(tabId, {
    action: 'bubbleStatusUpdate',
    status: 'Checking...'
  }).catch(() => {});
  
  // Send check command to content script
  chrome.tabs.sendMessage(tabId, {
    action: 'performContinuousCheck',
    config: {
      monitorVideos: state.monitorVideos,
      monitorPage: state.monitorPage
    }
  }).then((response) => {
    if (response && response.success) {
      console.log('✅ Check command sent successfully');
      updatePopupStatus(tabId, 'Analyzing...', null);
    } else {
      console.warn('⚠️ Check command failed:', response?.error);
    }
  }).catch(err => {
    console.error('❌ Error sending check command:', err);
    
    // If content script is unreachable, stop continuous mode
    if (err.message && err.message.includes('Could not establish connection')) {
      console.log('Content script unreachable, stopping continuous mode');
      stopContinuousMode(tabId);
    }
  });
}

function updatePopupStatus(tabId, status, nextCheckDelay) {
  chrome.runtime.sendMessage({
    action: 'continuousModeStatus',
    tabId: tabId,
    status: status,
    nextCheck: nextCheckDelay
  }).catch(() => {
    // Popup not open, ignore
  });
}

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (continuousModeState.has(tabId)) {
    console.log(`🗑️ Tab ${tabId} closed, cleaning up continuous mode`);
    stopContinuousMode(tabId);
  }
  screenReaderState.delete(tabId);
});

// Clean up when tab navigates away
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading' && continuousModeState.has(tabId)) {
    console.log(`🔄 Tab ${tabId} navigating, stopping continuous mode`);
    stopContinuousMode(tabId);
  }
});

// Handle keyboard shortcuts
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'toggle-screen-reader') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const tabId = tabs[0].id;
        const isActive = !screenReaderState.get(tabId);
        screenReaderState.set(tabId, isActive);
        
        chrome.tabs.sendMessage(tabId, { 
          action: 'toggle',
          isActive: isActive
        });
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
  }, 25000);
}
startKeepAlive();

console.log('✅ ReadBuddy v4.1.2 background service worker loaded');