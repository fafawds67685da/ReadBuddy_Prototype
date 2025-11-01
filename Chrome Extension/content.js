// content.js - FIXED: Proper async message handling and error recovery

class ReadBuddyScreenReader {
  constructor() {
    this.enabled = false;
    this.currentElement = null;
    this.elementIndex = 0;
    this.navigableElements = [];
    this.speechRate = 1.0;
    this.speaking = false;
    
    this.initKeyboardShortcuts();
  }

  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!this.enabled) {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
          e.preventDefault();
          this.toggle();
        }
        return;
      }

      const handled = this.handleKeyPress(e);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  handleKeyPress(e) {
    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey;
    const shift = e.shiftKey;

    if (ctrl && shift && key === 'r') {
      this.toggle();
      return true;
    }

    switch (key) {
      case 'j':
        this.navigateNext();
        return true;
      
      case 'k':
        this.navigatePrevious();
        return true;
      
      case 'h':
        this.navigateToNext('h1, h2, h3, h4, h5, h6');
        return true;
      
      case 'l':
        this.navigateToNext('a[href]');
        return true;
      
      case 'b':
        this.navigateToNext('button, input[type="button"], input[type="submit"]');
        return true;
      
      case 'g':
        this.navigateToNext('img');
        return true;
      
      case 'f':
        this.navigateToNext('input:not([type="button"]):not([type="submit"]), select, textarea');
        return true;
      
      case 's':
        this.stopSpeaking();
        return true;
      
      case 'r':
        this.announceCurrentElement();
        return true;
      
      case 'escape':
        this.stopSpeaking();
        return true;
      
      case 'enter':
        if (this.currentElement && !this.currentElement.matches('input, textarea, select')) {
          this.currentElement.click();
        }
        return false;
    }

    return false;
  }

  toggle() {
    this.enabled = !this.enabled;
    
    if (this.enabled) {
      this.speak("ReadBuddy screen reader enabled. Press J to navigate forward, K to navigate backward, H for headings, L for links, B for buttons, G for images. Press Control Shift R to disable.");
      this.updateNavigableElements();
      
      const startElement = document.querySelector('h1, h2, main, article') || document.body;
      this.currentElement = startElement;
      this.highlightElement(startElement);
    } else {
      this.speak("ReadBuddy screen reader disabled");
      this.clearHighlight();
      this.stopSpeaking();
    }
  }

  updateNavigableElements() {
    this.navigableElements = Array.from(
      document.querySelectorAll(
        'h1, h2, h3, h4, h5, h6, p, a, button, input, select, textarea, img[alt], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             el.offsetParent !== null &&
             el.offsetWidth > 0 &&
             el.offsetHeight > 0;
    });
    
    this.elementIndex = 0;
  }

  navigateNext() {
    if (this.navigableElements.length === 0) {
      this.updateNavigableElements();
    }

    this.elementIndex = (this.elementIndex + 1) % this.navigableElements.length;
    this.currentElement = this.navigableElements[this.elementIndex];
    this.announceCurrentElement();
  }

  navigatePrevious() {
    if (this.navigableElements.length === 0) {
      this.updateNavigableElements();
    }

    this.elementIndex = (this.elementIndex - 1 + this.navigableElements.length) % this.navigableElements.length;
    this.currentElement = this.navigableElements[this.elementIndex];
    this.announceCurrentElement();
  }

  navigateToNext(selector) {
    const elements = Array.from(document.querySelectorAll(selector)).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    });
    
    const currentIndex = this.currentElement ? elements.indexOf(this.currentElement) : -1;
    const nextElement = elements[currentIndex + 1] || elements[0];
    
    if (nextElement) {
      this.currentElement = nextElement;
      this.elementIndex = this.navigableElements.indexOf(nextElement);
      this.announceCurrentElement();
    } else {
      const elementType = selector.includes('h') ? 'heading' : 
                         selector.includes('a') ? 'link' :
                         selector.includes('button') ? 'button' :
                         selector.includes('img') ? 'image' : 'element';
      this.speak(`No more ${elementType}s found`);
    }
  }

  announceCurrentElement() {
    if (!this.currentElement) return;

    this.highlightElement(this.currentElement);
    this.scrollIntoView(this.currentElement);

    const announcement = this.getElementDescription(this.currentElement);
    this.speak(announcement);
  }

  getElementDescription(element) {
    const tag = element.tagName.toLowerCase();
    let description = '';

    if (tag.match(/h[1-6]/)) {
      description = `Heading level ${tag.charAt(1)}, `;
    } else if (tag === 'a') {
      description = 'Link, ';
    } else if (tag === 'button' || element.role === 'button') {
      description = 'Button, ';
    } else if (tag === 'input') {
      description = `${element.type || 'text'} input, `;
    } else if (tag === 'select') {
      description = 'Dropdown menu, ';
    } else if (tag === 'textarea') {
      description = 'Text area, ';
    } else if (tag === 'img') {
      description = 'Image, ';
    } else if (tag === 'p') {
      description = '';
    }

    if (tag === 'img') {
      description += element.alt || element.title || 'no description available';
    } else if (element.ariaLabel) {
      description += element.ariaLabel;
    } else if (element.title) {
      description += element.title;
    } else if (tag === 'input' && element.placeholder) {
      description += element.placeholder;
    } else {
      const text = (element.innerText || element.textContent || '').trim();
      if (text) {
        description += text.substring(0, 200);
      } else {
        description += 'empty';
      }
    }

    if (element.disabled) {
      description += ', disabled';
    }
    if (element.required) {
      description += ', required';
    }
    if (element.checked !== undefined) {
      description += element.checked ? ', checked' : ', not checked';
    }
    if (tag === 'select') {
      const selected = element.selectedOptions[0];
      if (selected) {
        description += `, selected: ${selected.text}`;
      }
    }

    return description;
  }

  highlightElement(element) {
    this.clearHighlight();
    if (!element) return;

    element.style.outline = '3px solid #ff6b35';
    element.style.outlineOffset = '2px';
    element.setAttribute('data-readbuddy-highlight', 'true');
  }

  clearHighlight() {
    const highlighted = document.querySelector('[data-readbuddy-highlight]');
    if (highlighted) {
      highlighted.style.outline = '';
      highlighted.style.outlineOffset = '';
      highlighted.removeAttribute('data-readbuddy-highlight');
    }
  }

  scrollIntoView(element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
  }

  speak(text, interrupt = true) {
    if (interrupt) {
      this.stopSpeaking();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.speechRate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      this.speaking = true;
    };
    
    utterance.onend = () => {
      this.speaking = false;
    };

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    window.speechSynthesis.cancel();
    this.speaking = false;
  }
}

// Initialize screen reader
const readBuddy = new ReadBuddyScreenReader();

// ============ BUBBLE BUTTON INTEGRATION ============

// Extract page content for bubble's "Analyze & Speak"
function extractPageContent() {
  console.log('📄 Extracting page content for bubble...');
  
  // Get text content
  const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article, main, section');
  const textContent = Array.from(textElements)
    .map(el => el.textContent.trim())
    .filter(text => text.length > 20)
    .join(' ')
    .substring(0, 4000); // Match popup.js limit

  // Get images
  const images = Array.from(document.querySelectorAll('img'))
    .filter(img => {
      const src = img.src || "";
      const isValidSize = img.width > 100 && img.height > 100;
      const isHttp = src.startsWith("http");
      return isValidSize && isHttp;
    })
    .map(img => img.src)
    .slice(0, 10);

  // Get videos
  const videos = [];
  
  document.querySelectorAll('video').forEach(v => {
    if (v.src || v.currentSrc) {
      videos.push(v.src || v.currentSrc);
    }
  });
  
  document.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.src || '';
    if (src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com')) {
      videos.push(src);
    }
  });

  return {
    text: textContent,
    images: images,
    videos: videos.slice(0, 5),
    url: window.location.href,
    title: document.title,
    timestamp: Date.now()
  };
}

// ✅ FIXED: Better async helper function with longer timeout
function waitForContinuousMode(timeout = 5000) {
  return new Promise((resolve, reject) => {
    // Check if already loaded and ready
    if (window.continuousModeInstance) {
      // Check if dependencies are ready
      if (window.continuousModeInstance.dependenciesReady) {
        resolve(window.continuousModeInstance);
        return;
      }
      // If not ready, wait for initialization
      window.continuousModeInstance.initializationPromise
        .then(() => resolve(window.continuousModeInstance))
        .catch(err => reject(err));
      return;
    }

    // Wait for it to load
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (window.continuousModeInstance) {
        clearInterval(checkInterval);
        
        // Wait for dependencies to be ready
        window.continuousModeInstance.initializationPromise
          .then(() => resolve(window.continuousModeInstance))
          .catch(err => reject(err));
          
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('ContinuousMode failed to load after ' + (timeout/1000) + ' seconds. Please refresh the page and wait a moment before trying again.'));
      }
    }, 100);
  });
}

// Listen for messages from popup, background, and bubble
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received:', request.action);

  // ============ SCREEN READER ACTIONS ============
  if (request.action === 'toggle') {
    readBuddy.toggle();
    sendResponse({ enabled: readBuddy.enabled });
    return false; // Sync response
  } 
  
  else if (request.action === 'updateRate') {
    readBuddy.speechRate = request.rate;
    sendResponse({ success: true });
    return false; // Sync response
  }

  // ============ BUBBLE BUTTON ACTIONS ============
  else if (request.action === 'getPageContent') {
    try {
      const pageContent = extractPageContent();
      console.log('✅ Page content extracted:', {
        textLength: pageContent.text.length,
        images: pageContent.images.length,
        videos: pageContent.videos.length
      });
      sendResponse({ success: true, data: pageContent });
    } catch (error) {
      console.error('❌ Error extracting page content:', error);
      sendResponse({ success: false, error: error.message });
    }
    return false; // Sync response
  }

  else if (request.action === 'bubbleStatusUpdate') {
    // Bubble receives status updates from background
    console.log('📊 Bubble status update:', request.status);
    sendResponse({ received: true });
    return false; // Sync response
  }
  
  // ============ CONTINUOUS MODE HANDLERS (FIXED) ============
  else if (request.action === 'initContinuousMode') {
    console.log('Initializing continuous mode with config:', request.config);
    
    // Use async IIFE to handle properly
    (async () => {
      try {
        const instance = await waitForContinuousMode(5000);
        await instance.initialize(request.config);
        sendResponse({ success: true });
      } catch (err) {
        console.error('❌ ContinuousMode initialization failed:', err);
        sendResponse({ 
          success: false, 
          error: err.message || 'Failed to initialize continuous mode. Please refresh the page.'
        });
      }
    })();
    
    return true; // Keep channel open for async response
  }
  
  else if (request.action === 'stopContinuousMode') {
    console.log('Stopping continuous mode');
    
    (async () => {
      try {
        const instance = await waitForContinuousMode(1000);
        instance.stop();
        sendResponse({ success: true });
      } catch (err) {
        // If it doesn't exist, consider it already stopped
        console.log('ContinuousMode not available, already stopped');
        sendResponse({ success: true });
      }
    })();
    
    return true; // Keep channel open
  }
  
  else if (request.action === 'performContinuousCheck') {
    console.log('Performing continuous check...');
    
    (async () => {
      try {
        const instance = await waitForContinuousMode(1000);
        const result = await instance.performCheck();
        
        console.log('Check complete:', result);
        
        // Send results back to background
        chrome.runtime.sendMessage({
          action: 'continuousCheckComplete',
          tabId: sender.tab?.id,
          data: result
        }).catch(err => {
          console.warn('Could not send results to background:', err);
        });
        
        sendResponse({ success: true, result: result });
      } catch (err) {
        console.error('Check failed:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    
    return true; // Keep channel open for async response
  }
  
  // Unknown action
  return false;
});

console.log('✅ ReadBuddy content script loaded. Press Ctrl+Shift+R to enable screen reader.');