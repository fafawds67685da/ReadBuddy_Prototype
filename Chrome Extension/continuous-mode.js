// continuous-mode.js - FIXED: Proper async dependency loading with error handling

class ContinuousMode {
  constructor() {
    this.enabled = false;
    this.config = null;
    this.videoMonitor = null;
    this.pageDetector = null;
    this.lastCheckTime = 0;
    this.dependenciesReady = false;
    this.initializationPromise = null;
    this.initializationError = null;
    
    // Start initialization immediately (but don't await in constructor)
    this.initializationPromise = this.waitForDependencies();
  }

  /**
   * Wait for VideoMonitor and PageChangeDetector to be available
   */
  async waitForDependencies() {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max (100 * 100ms)
    
    console.log('⏳ Waiting for dependencies to load...');
    
    while (attempts < maxAttempts) {
      // Check if all required classes are available
      if (window.VideoMonitor && window.PageChangeDetector && window.FrameProcessor) {
        try {
          // Try to instantiate them
          this.videoMonitor = new window.VideoMonitor();
          this.pageDetector = new window.PageChangeDetector();
          this.dependenciesReady = true;
          console.log('✅ ContinuousMode dependencies loaded successfully');
          return true;
        } catch (err) {
          console.error('Error initializing dependencies:', err);
          this.initializationError = err.message;
          return false;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
      
      // Log progress every 20 attempts (2 seconds)
      if (attempts % 20 === 0) {
        console.log(`⏳ Still waiting for dependencies... (${attempts / 10}s elapsed)`);
        console.log('Available:', {
          FrameProcessor: !!window.FrameProcessor,
          PageChangeDetector: !!window.PageChangeDetector,
          VideoMonitor: !!window.VideoMonitor
        });
      }
    }
    
    // Timeout reached
    const missing = [];
    if (!window.FrameProcessor) missing.push('FrameProcessor');
    if (!window.PageChangeDetector) missing.push('PageChangeDetector');
    if (!window.VideoMonitor) missing.push('VideoMonitor');
    
    this.initializationError = `Failed to load: ${missing.join(', ')}. Please refresh the page.`;
    console.error('❌ Dependency loading timeout:', this.initializationError);
    return false;
  }

  /**
   * Ensure dependencies are ready before use
   */
  async ensureReady() {
    if (this.dependenciesReady) {
      return true;
    }
    
    // Wait for initialization to complete
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    
    if (!this.dependenciesReady) {
      throw new Error(this.initializationError || 'Dependencies not ready. Please refresh and try again.');
    }
    
    return true;
  }

  /**
   * Initialize continuous mode
   */
  async initialize(config) {
    console.log('🎯 Initializing continuous mode...', config);
    
    // Ensure dependencies are ready
    await this.ensureReady();
    
    if (!this.videoMonitor || !this.pageDetector) {
      throw new Error('Required components not available');
    }
    
    this.config = config;
    this.enabled = true;
    this.lastCheckTime = Date.now();

    // Start page change detection if enabled
    if (config.monitorPage) {
      this.pageDetector.startMonitoring();
    }

    console.log('✅ Continuous mode initialized');
    return true;
  }

  /**
   * Stop continuous mode
   */
  stop() {
    console.log('🛑 Stopping continuous mode...');
    
    this.enabled = false;
    this.config = null;
    
    if (this.pageDetector) {
      this.pageDetector.stopMonitoring();
    }
    
    console.log('✅ Continuous mode stopped');
  }

  /**
   * Perform a monitoring check
   */
  async performCheck() {
    if (!this.enabled || !this.config) {
      return {
        type: 'error',
        message: 'Continuous mode not enabled'
      };
    }

    // Ensure still ready
    try {
      await this.ensureReady();
    } catch (err) {
      return {
        type: 'error',
        message: err.message
      };
    }

    console.log('🔍 Performing continuous check...');
    this.lastCheckTime = Date.now();

    try {
      // Priority 1: Check for playing video
      if (this.config.monitorVideos) {
        const videoResult = await this.checkVideo();
        if (videoResult && videoResult.type !== 'no_change') {
          return videoResult;
        }
      }

      // Priority 2: Check for page changes
      if (this.config.monitorPage) {
        const pageResult = await this.checkPageChanges();
        if (pageResult && pageResult.type !== 'no_change') {
          return pageResult;
        }
      }

      // No changes detected
      return {
        type: 'no_change',
        message: 'No significant changes detected',
        speakText: null
      };

    } catch (err) {
      console.error('Error in continuous check:', err);
      return {
        type: 'error',
        message: err.message,
        speakText: 'Error performing check'
      };
    }
  }

  /**
   * Check for playing video and analyze
   */
  async checkVideo() {
    if (!this.videoMonitor) {
      return null;
    }
    
    const playingVideos = this.videoMonitor.detectPlayingVideos();
    
    if (playingVideos.length === 0) {
      return { type: 'no_change' };
    }

    console.log('🎬 Video detected, analyzing...');

    try {
      const result = await this.videoMonitor.analyzeVideo(this.config);

      if (result && result.error) {
        // Video exists but couldn't be analyzed
        if (result.fallback) {
          return {
            type: 'video',
            description: `Video is playing: ${result.fallback.src || 'Unknown source'}`,
            speakText: 'Video is playing but frame analysis unavailable',
            metadata: result.fallback
          };
        }
        return { type: 'no_change' };
      }

      if (result && result.success) {
        const speakText = this.generateVideoNarration(result);
        
        return {
          type: 'video',
          description: result.description,
          objects: result.objects || [],
          confidence: result.confidence,
          speakText: speakText,
          metadata: result.metadata
        };
      }
    } catch (err) {
      console.error('Video check error:', err);
    }

    return { type: 'no_change' };
  }

  /**
   * Check for page changes
   */
  async checkPageChanges() {
    if (!this.pageDetector) {
      return null;
    }
    
    const changes = this.pageDetector.detectChanges();

    if (!changes.hasChanges) {
      return { type: 'no_change' };
    }

    console.log('📄 Page changes detected:', changes);

    // Try to describe new images
    let imageDescriptions = null;
    if (changes.newImageUrls && changes.newImageUrls.length > 0) {
      imageDescriptions = await this.describeNewImages(changes.newImageUrls);
    }

    const speakText = this.generatePageChangeNarration(changes, imageDescriptions);

    return {
      type: 'page',
      hasChanges: true,
      summary: changes.summary,
      details: changes.details,
      imageDescriptions: imageDescriptions,
      speakText: speakText
    };
  }

  /**
   * Describe new images
   */
  async describeNewImages(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) {
      return null;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '',
          images: imageUrls.slice(0, 2), // Max 2 images
          videos: []
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      return data.image_descriptions || null;
    } catch (err) {
      console.error('Error describing images:', err);
      return null;
    }
  }

  /**
   * Generate narration for video
   */
  generateVideoNarration(result) {
    let text = `Video update: ${result.description}`;
    
    if (result.objects && result.objects.length > 0) {
      const objectList = result.objects.slice(0, 3).join(', ');
      text += `. Visible elements: ${objectList}`;
    }

    return text;
  }

  /**
   * Generate narration for page changes
   */
  generatePageChangeNarration(changes, imageDescriptions) {
    let text = `Page update: ${changes.summary}`;

    if (imageDescriptions && imageDescriptions.length > 0) {
      text += '. New images: ';
      imageDescriptions.forEach((img) => {
        const caption = typeof img === 'object' ? img.caption : img;
        if (caption && !caption.includes('No valid')) {
          text += `${caption}. `;
        }
      });
    }

    return text;
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      dependenciesReady: this.dependenciesReady,
      initializationError: this.initializationError,
      config: this.config,
      lastCheck: this.lastCheckTime,
      timeSinceLastCheck: Date.now() - this.lastCheckTime
    };
  }
}

// Create instance immediately
window.continuousModeInstance = new ContinuousMode();

console.log('✅ ContinuousMode loaded - instance created');