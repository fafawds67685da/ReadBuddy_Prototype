// bubble-button.js - FIXED: Error boundaries and retry logic

class ReadBuddyBubble {
  constructor() {
    this.bubble = null;
    this.panel = null;
    this.isDragging = false;
    this.dragMoved = false;
    this.isMinimized = true;
    this.isContinuousModeActive = false;
    this.isScreenReaderActive = false;
    this.currentX = 0;
    this.currentY = 0;
    this.initialX = 0;
    this.initialY = 0;
    this.xOffset = 0;
    this.yOffset = 0;
    
    this.init();
  }

  init() {
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    try {
      this.injectStyles();
      this.createBubble();
      this.createPanel();
      this.attachEventListeners();
      this.loadPosition();
      this.checkInitialStates();
      this.setupMessageListener();
      console.log('✅ Bubble button initialized successfully');
    } catch (err) {
      console.error('❌ Error during bubble setup:', err);
      // Retry after delay
      setTimeout(() => {
        console.log('🔄 Retrying bubble initialization...');
        try {
          this.setup();
        } catch (retryErr) {
          console.error('❌ Bubble retry failed:', retryErr);
        }
      }, 2000);
    }
  }

  checkInitialStates() {
    try {
      chrome.runtime.sendMessage({ action: 'getStates' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Could not get states:', chrome.runtime.lastError);
          return;
        }
        if (response) {
          if (response.continuousMode) {
            this.updateContinuousModeUI(true);
          }
          if (response.screenReader) {
            this.updateScreenReaderUI(true);
          }
        }
      });
    } catch (err) {
      console.warn('Error checking initial states:', err);
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'bubbleStatusUpdate') {
        this.showStatus(request.status);
        
        if (request.continuousMode !== undefined) {
          this.updateContinuousModeUI(request.continuousMode);
        }
        
        if (request.data) {
          setTimeout(() => this.hideStatus(), 3000);
        }
      }
      sendResponse({ received: true });
      return true;
    });
  }

  injectStyles() {
    if (document.getElementById('readbuddy-bubble-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'readbuddy-bubble-styles';
    style.textContent = `
      #readbuddy-bubble {
        position: fixed !important;
        bottom: 30px;
        right: 30px;
        width: 60px !important;
        height: 60px !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50% !important;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        cursor: move !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        user-select: none;
        pointer-events: auto !important;
      }

      #readbuddy-bubble:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
      }

      #readbuddy-bubble:active {
        transform: scale(0.95);
      }

      #readbuddy-bubble .bubble-icon {
        pointer-events: none;
      }

      #readbuddy-bubble .bubble-badge {
        position: absolute;
        top: 0;
        right: 0;
        width: 16px;
        height: 16px;
        background: #ef4444;
        border-radius: 50%;
        color: white;
        font-size: 8px;
        display: none;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        animation: bubble-pulse 2s infinite;
        pointer-events: none;
      }

      @keyframes bubble-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      #readbuddy-panel {
        position: fixed !important;
        bottom: 100px;
        right: 30px;
        width: 320px;
        max-height: 500px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        z-index: 2147483646 !important;
        display: none;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        pointer-events: auto !important;
      }

      .panel-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .panel-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .panel-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .panel-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      .panel-content {
        padding: 16px;
        max-height: 420px;
        overflow-y: auto;
      }

      .panel-section {
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e5e7eb;
      }

      .panel-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .panel-section h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }

      .action-btn {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
        margin-bottom: 8px;
      }

      .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .action-btn.primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .action-btn.primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }

      .action-btn.secondary {
        background: #10b981;
        color: white;
      }

      .action-btn.secondary:hover:not(:disabled) {
        background: #059669;
      }

      .action-btn.secondary.active {
        background: #ef4444;
      }

      .action-btn.outline {
        background: white;
        border: 2px solid #667eea;
        color: #667eea;
      }

      .action-btn.outline:hover:not(:disabled) {
        background: #667eea;
        color: white;
      }

      .action-btn.outline.active {
        background: #667eea;
        color: white;
      }

      .setting-item {
        margin-bottom: 12px;
      }

      .setting-item label {
        display: block;
        font-size: 13px;
        color: #4b5563;
        margin-bottom: 6px;
      }

      .setting-item input[type="range"] {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: #e5e7eb;
        outline: none;
        -webkit-appearance: none;
      }

      .setting-item input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #667eea;
        cursor: pointer;
      }

      .status-display {
        background: #f3f4f6;
        padding: 12px;
        border-radius: 8px;
        text-align: center;
        display: none;
      }

      .status-text {
        font-size: 13px;
        color: #4b5563;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  }

  createBubble() {
    this.bubble = document.createElement('div');
    this.bubble.id = 'readbuddy-bubble';
    
    this.bubble.innerHTML = `
      <div class="bubble-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="white"/>
        </svg>
      </div>
      <div class="bubble-badge" id="readbuddy-badge">●</div>
    `;

    document.body.appendChild(this.bubble);
  }

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'readbuddy-panel';
    
    this.panel.innerHTML = `
      <div class="panel-header">
        <h3>🔊 ReadBuddy</h3>
        <button id="panel-minimize" class="panel-btn" title="Minimize">−</button>
      </div>
      <div class="panel-content">
        <div class="panel-section">
          <button id="analyze-speak-btn" class="action-btn primary">
            <span>📝</span> Analyze & Speak
          </button>
          <button id="continuous-mode-btn" class="action-btn secondary">
            <span>🔄</span> Start Continuous Mode
          </button>
        </div>
        
        <div class="panel-section">
          <h4>⚙️ Quick Settings</h4>
          <div class="setting-item">
            <label>Speech Speed: <span id="speed-value">1.0x</span></label>
            <input type="range" id="speech-speed" min="0.5" max="2" step="0.1" value="1">
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="auto-speak" checked>
              Auto-speak results
            </label>
          </div>
        </div>

        <div class="panel-section">
          <h4>⌨️ Screen Reader</h4>
          <button id="toggle-reader-btn" class="action-btn outline">
            <span>👁️</span> Toggle Screen Reader
          </button>
          <div style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 4px;">Ctrl+Shift+R</div>
        </div>

        <div id="status-display" class="status-display">
          <div class="status-text">Ready</div>
        </div>
      </div>
    `;

    document.body.appendChild(this.panel);
  }

  attachEventListeners() {
    // Bubble click - prevent propagation
    this.bubble.addEventListener('mousedown', (e) => {
      this.dragStart(e);
    });

    this.bubble.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.dragMoved) {
        this.togglePanel();
      }
      this.dragMoved = false;
    });

    // Global drag handlers
    document.addEventListener('mousemove', (e) => this.drag(e));
    document.addEventListener('mouseup', () => this.dragEnd());

    // Panel controls
    const minimize = document.getElementById('panel-minimize');
    if (minimize) {
      minimize.addEventListener('click', () => this.togglePanel());
    }

    const analyzeBtn = document.getElementById('analyze-speak-btn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeAndSpeak());
    }

    const continuousBtn = document.getElementById('continuous-mode-btn');
    if (continuousBtn) {
      continuousBtn.addEventListener('click', () => this.toggleContinuousMode());
    }

    const readerBtn = document.getElementById('toggle-reader-btn');
    if (readerBtn) {
      readerBtn.addEventListener('click', () => this.toggleScreenReader());
    }

    // Settings
    const speedSlider = document.getElementById('speech-speed');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('speed-value').textContent = `${value}x`;
        chrome.storage.sync.set({ speechRate: parseFloat(value) });
      });
    }

    const autoSpeak = document.getElementById('auto-speak');
    if (autoSpeak) {
      autoSpeak.addEventListener('change', (e) => {
        chrome.storage.sync.set({ autoSpeak: e.target.checked });
      });
    }

    this.loadSettings();
  }

  togglePanel() {
    this.isMinimized = !this.isMinimized;
    this.panel.style.display = this.isMinimized ? 'none' : 'block';
    this.speak(this.isMinimized ? 'Panel closed' : 'Panel opened');
  }

  dragStart(e) {
    this.initialX = e.clientX - this.xOffset;
    this.initialY = e.clientY - this.yOffset;
    this.isDragging = true;
    this.dragMoved = false;
    this.bubble.style.cursor = 'grabbing';
  }

  drag(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    this.dragMoved = true;
    
    this.currentX = e.clientX - this.initialX;
    this.currentY = e.clientY - this.initialY;
    
    this.xOffset = this.currentX;
    this.yOffset = this.currentY;
    
    this.bubble.style.transform = `translate3d(${this.currentX}px, ${this.currentY}px, 0)`;
  }

  dragEnd() {
    if (this.isDragging) {
      this.isDragging = false;
      this.bubble.style.cursor = 'move';
      if (this.dragMoved) {
        this.savePosition();
      }
    }
  }

  savePosition() {
    chrome.storage.sync.set({
      bubblePosition: { x: this.xOffset, y: this.yOffset }
    });
  }

  loadPosition() {
    chrome.storage.sync.get(['bubblePosition'], (result) => {
      if (result.bubblePosition) {
        this.xOffset = result.bubblePosition.x;
        this.yOffset = result.bubblePosition.y;
        this.bubble.style.transform = `translate3d(${this.xOffset}px, ${this.yOffset}px, 0)`;
      }
    });
  }

  loadSettings() {
    chrome.storage.sync.get(['speechRate', 'autoSpeak'], (result) => {
      if (result.speechRate) {
        const slider = document.getElementById('speech-speed');
        const value = document.getElementById('speed-value');
        if (slider) slider.value = result.speechRate;
        if (value) value.textContent = `${result.speechRate}x`;
      }
      if (result.autoSpeak !== undefined) {
        const checkbox = document.getElementById('auto-speak');
        if (checkbox) checkbox.checked = result.autoSpeak;
      }
    });
  }

  analyzeAndSpeak() {
    this.showStatus('Analyzing page...');
    const btn = document.getElementById('analyze-speak-btn');
    if (btn) btn.disabled = true;
    
    chrome.runtime.sendMessage({ action: 'analyzeAndSpeak' }, (response) => {
      if (btn) btn.disabled = false;
      
      if (chrome.runtime.lastError) {
        this.showStatus('Error: Connection failed');
        setTimeout(() => this.hideStatus(), 3000);
        return;
      }
      
      if (response?.success) {
        this.showStatus('Analysis complete!');
        setTimeout(() => this.hideStatus(), 2000);
      } else {
        this.showStatus('Error: ' + (response?.error || 'Unknown error'));
        setTimeout(() => this.hideStatus(), 3000);
      }
    });
  }

  toggleContinuousMode() {
    const btn = document.getElementById('continuous-mode-btn');
    if (btn) btn.disabled = true;
    
    chrome.runtime.sendMessage({ action: 'toggleContinuousMode' }, (response) => {
      if (btn) btn.disabled = false;
      
      if (chrome.runtime.lastError) {
        this.showStatus('Error: Connection failed');
        return;
      }
      
      if (response?.isActive) {
        this.updateContinuousModeUI(true);
        this.showStatus('Monitoring started');
      } else {
        this.updateContinuousModeUI(false);
        this.showStatus('Monitoring stopped');
        setTimeout(() => this.hideStatus(), 2000);
      }
    });
  }

  updateContinuousModeUI(isActive) {
    this.isContinuousModeActive = isActive;
    const btn = document.getElementById('continuous-mode-btn');
    const badge = document.getElementById('readbuddy-badge');
    
    if (btn) {
      if (isActive) {
        btn.innerHTML = '<span>⏸️</span> Stop Continuous Mode';
        btn.classList.add('active');
      } else {
        btn.innerHTML = '<span>🔄</span> Start Continuous Mode';
        btn.classList.remove('active');
      }
    }
    
    if (badge) {
      badge.style.display = isActive ? 'flex' : 'none';
    }
  }

  toggleScreenReader() {
    const btn = document.getElementById('toggle-reader-btn');
    if (btn) btn.disabled = true;
    
    chrome.runtime.sendMessage({ action: 'toggleScreenReader' }, (response) => {
      if (btn) btn.disabled = false;
      
      if (response?.isActive) {
        this.updateScreenReaderUI(true);
        this.showStatus('Screen reader ON');
        this.speak('Screen reader activated');
      } else {
        this.updateScreenReaderUI(false);
        this.showStatus('Screen reader OFF');
        this.speak('Screen reader deactivated');
      }
      setTimeout(() => this.hideStatus(), 2000);
    });
  }

  updateScreenReaderUI(isActive) {
    this.isScreenReaderActive = isActive;
    const btn = document.getElementById('toggle-reader-btn');
    
    if (btn) {
      if (isActive) {
        btn.classList.add('active');
        btn.innerHTML = '<span>👁️</span> Screen Reader ON';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '<span>👁️</span> Toggle Screen Reader';
      }
    }
  }

  showStatus(text) {
    const display = document.getElementById('status-display');
    const textEl = display?.querySelector('.status-text');
    if (textEl) {
      textEl.textContent = text;
      display.style.display = 'block';
    }
  }

  hideStatus() {
    const display = document.getElementById('status-display');
    if (display) display.style.display = 'none';
  }

  speak(text) {
    chrome.storage.sync.get(['speechRate'], (result) => {
      chrome.runtime.sendMessage({
        action: 'speak',
        text: text,
        rate: result.speechRate || 1.0
      });
    });
  }
}

// Initialize with error boundary
try {
  let bubbleInstance;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        bubbleInstance = new ReadBuddyBubble();
      } catch (err) {
        console.error('❌ Failed to initialize bubble on DOMContentLoaded:', err);
        // Retry after delay
        setTimeout(() => {
          try {
            bubbleInstance = new ReadBuddyBubble();
          } catch (retryErr) {
            console.error('❌ Bubble retry failed:', retryErr);
          }
        }, 2000);
      }
    });
  } else {
    bubbleInstance = new ReadBuddyBubble();
  }
} catch (err) {
  console.error('❌ Critical error loading bubble button:', err);
  // Try one more time after delay
  setTimeout(() => {
    try {
      const bubbleInstance = new ReadBuddyBubble();
    } catch (finalErr) {
      console.error('❌ Final bubble initialization attempt failed:', finalErr);
    }
  }, 3000);
}

console.log('✅ Bubble button script loaded');