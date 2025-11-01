// video-monitor.js - FIXED: Lazy instantiation of FrameProcessor

class VideoMonitor {
  constructor() {
    // Don't instantiate FrameProcessor immediately - lazy load it
    this.frameProcessor = null;
    this.currentVideo = null;
  }

  /**
   * Get or create FrameProcessor instance (lazy loading)
   */
  getFrameProcessor() {
    if (!this.frameProcessor) {
      if (!window.FrameProcessor) {
        throw new Error('FrameProcessor not available. Extension scripts may not be fully loaded.');
      }
      this.frameProcessor = new window.FrameProcessor();
      console.log('✅ FrameProcessor instantiated');
    }
    return this.frameProcessor;
  }

  /**
   * Detect all playing videos on the page
   * @returns {Array<HTMLVideoElement>} - Array of playing video elements
   */
  detectPlayingVideos() {
    const videos = Array.from(document.querySelectorAll('video'));
    return videos.filter(video => this.isVideoPlaying(video));
  }

  /**
   * Check if a video is currently playing
   * @param {HTMLVideoElement} video - The video element
   * @returns {boolean} - True if playing
   */
  isVideoPlaying(video) {
    return !!(
      video &&
      video.currentTime > 0 &&
      !video.paused &&
      !video.ended &&
      video.readyState > 2
    );
  }

  /**
   * Get the primary playing video (largest one)
   * @returns {HTMLVideoElement|null} - Main video or null
   */
  getPrimaryVideo() {
    const playingVideos = this.detectPlayingVideos();
    
    if (playingVideos.length === 0) {
      return null;
    }

    // Return largest video by area
    return playingVideos.reduce((largest, video) => {
      const area = video.videoWidth * video.videoHeight;
      const largestArea = largest.videoWidth * largest.videoHeight;
      return area > largestArea ? video : largest;
    });
  }

  /**
   * Analyze video and capture frames
   * @param {Object} config - Analysis configuration
   * @returns {Promise<Object|null>} - Analysis result or null
   */
  async analyzeVideo(config = {}) {
    const video = this.getPrimaryVideo();
    
    if (!video) {
      console.log('No playing video detected');
      return null;
    }

    console.log('🎬 Video detected:', {
      src: video.src || video.currentSrc,
      dimensions: `${video.videoWidth}x${video.videoHeight}`,
      currentTime: video.currentTime,
      duration: video.duration
    });

    // Get frame processor (lazy load)
    let processor;
    try {
      processor = this.getFrameProcessor();
    } catch (err) {
      console.error('FrameProcessor unavailable:', err);
      return {
        error: true,
        message: err.message,
        fallback: this.getVideoMetadata(video)
      };
    }

    // Check if video is capturable (CORS)
    if (!processor.isVideoCapturable(video)) {
      console.warn('Video cannot be captured (CORS restriction)');
      return {
        error: true,
        message: 'Video frame capture blocked by CORS policy',
        fallback: this.getVideoMetadata(video)
      };
    }

    try {
      // Pause video temporarily
      const wasPlaying = !video.paused;
      const originalTime = video.currentTime;
      
      if (wasPlaying) {
        video.pause();
      }

      // Show indicator
      this.showAnalyzingIndicator(video);

      // Capture frames from last 10 seconds
      const frames = await processor.captureMultipleFrames(
        video,
        3, // 3 frames
        10 // last 10 seconds
      );

      // Hide indicator
      this.hideAnalyzingIndicator();

      // Resume playback
      if (wasPlaying) {
        video.currentTime = originalTime;
        video.play().catch(err => {
          console.warn('Could not resume video:', err);
        });
      }

      if (frames.length === 0) {
        return {
          error: true,
          message: 'Could not capture any frames from video'
        };
      }

      // Send frames to backend for analysis
      const result = await this.sendFramesToBackend(frames, video);
      
      return result;

    } catch (err) {
      console.error('Error analyzing video:', err);
      this.hideAnalyzingIndicator();
      return {
        error: true,
        message: err.message
      };
    }
  }

  /**
   * Send captured frames to backend for analysis
   * @param {Array} frames - Array of frame data
   * @param {HTMLVideoElement} video - The video element
   * @returns {Promise<Object>} - Analysis result
   */
  async sendFramesToBackend(frames, video) {
    const processor = this.getFrameProcessor();
    const payload = processor.prepareForBackend(frames);
    
    // Add video metadata
    payload.metadata = this.getVideoMetadata(video);

    console.log(`📤 Sending ${frames.length} frames to backend...`);

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze-video-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Backend analysis complete:', data);

      return {
        success: true,
        description: data.description,
        objects: data.objects_detected || [],
        confidence: data.confidence || 0,
        metadata: payload.metadata
      };

    } catch (err) {
      console.error('Backend request failed:', err);
      return {
        error: true,
        message: 'Could not connect to backend server. Is it running?'
      };
    }
  }

  /**
   * Get video metadata
   * @param {HTMLVideoElement} video - The video element
   * @returns {Object} - Video metadata
   */
  getVideoMetadata(video) {
    return {
      src: video.src || video.currentSrc || 'unknown',
      currentTime: video.currentTime,
      duration: video.duration,
      dimensions: `${video.videoWidth}x${video.videoHeight}`,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume
    };
  }

  /**
   * Show "Analyzing..." indicator on video
   * @param {HTMLVideoElement} video - The video element
   */
  showAnalyzingIndicator(video) {
    // Remove existing indicator if any
    this.hideAnalyzingIndicator();
    
    const indicator = document.createElement('div');
    indicator.id = 'readbuddy-video-indicator';
    indicator.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(37, 99, 235, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      z-index: 999999;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    indicator.textContent = '🔍 Analyzing video...';

    // Position relative to video
    const parent = video.parentElement;
    if (parent) {
      parent.style.position = parent.style.position || 'relative';
      parent.appendChild(indicator);
    }
  }

  /**
   * Hide analyzing indicator
   */
  hideAnalyzingIndicator() {
    const indicator = document.getElementById('readbuddy-video-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Check if page has any videos (playing or not)
   * @returns {boolean} - True if videos exist
   */
  hasVideos() {
    return document.querySelectorAll('video').length > 0;
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.VideoMonitor = VideoMonitor;
}

console.log('✅ VideoMonitor loaded');