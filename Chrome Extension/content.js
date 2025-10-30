// content.js - Inject this into every webpage for screen reader functionality

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
        // Only listen for toggle shortcut when disabled
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'r') {
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
    const alt = e.altKey;

    // Toggle screen reader
    if (ctrl && alt && key === 'r') {
      this.toggle();
      return true;
    }

    // Navigation keys
    switch (key) {
      case 'j': // Next element
        this.navigateNext();
        return true;
      
      case 'k': // Previous element
        this.navigatePrevious();
        return true;
      
      case 'h': // Next heading
        this.navigateToNext('h1, h2, h3, h4, h5, h6');
        return true;
      
      case 'l': // Next link
        this.navigateToNext('a[href]');
        return true;
      
      case 'b': // Next button
        this.navigateToNext('button, input[type="button"], input[type="submit"]');
        return true;
      
      case 'g': // Next image
        this.navigateToNext('img');
        return true;
      
      case 'f': // Next form field
        this.navigateToNext('input:not([type="button"]):not([type="submit"]), select, textarea');
        return true;
      
      case 's': // Stop speech
        this.stopSpeaking();
        return true;
      
      case 'r': // Repeat current element
        this.announceCurrentElement();
        return true;
      
      case 'escape':
        this.stopSpeaking();
        return true;
      
      case 'enter':
        if (this.currentElement && !this.currentElement.matches('input, textarea, select')) {
          this.currentElement.click();
        }
        return false; // Allow default for form fields
    }

    return false;
  }

  toggle() {
    this.enabled = !this.enabled;
    
    if (this.enabled) {
      this.speak("ReadBuddy screen reader enabled. Press J to navigate forward, K to navigate backward, H for headings, L for links, B for buttons, G for images. Press Control Alt R to disable.");
      this.updateNavigableElements();
      
      // Start at the first heading or main content
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

    // Element type
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

    // Element content
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

    // Additional context
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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    readBuddy.toggle();
    sendResponse({ enabled: readBuddy.enabled });
  } else if (request.action === 'updateRate') {
    readBuddy.speechRate = request.rate;
    sendResponse({ success: true });
  }
  return true;
});

console.log('ReadBuddy content script loaded. Press Ctrl+Alt+R to enable screen reader.');