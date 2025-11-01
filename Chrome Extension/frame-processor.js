// frame-processor.js - Video frame capture and processing

class FrameProcessor {
  constructor() {
    this.canvas = null;
    this.context = null;
    this.previousFrames = [];
  }

  /**
   * Check if video can be captured (CORS check)
   */
  isVideoCapturable(video) {
    try {
      const canvas = this.getCanvas();
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      ctx.getImageData(0, 0, 1, 1); // This will throw if CORS blocked
      return true;
    } catch (err) {
      console.warn('Video not capturable:', err.message);
      return false;
    }
  }

  /**
   * Capture a single frame from video
   */
  captureFrame(video) {
    if (!video || video.readyState < 2) {
      throw new Error('Video not ready');
    }

    const canvas = this.getCanvas();
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  /**
   * Capture multiple frames from video
   */
  async captureMultipleFrames(video, count = 3, timeRangeSeconds = 10) {
    const frames = [];
    const currentTime = video.currentTime;
    const startTime = Math.max(0, currentTime - timeRangeSeconds);
    
    for (let i = 0; i < count; i++) {
      const seekTime = startTime + (timeRangeSeconds / count) * i;
      
      try {
        video.currentTime = seekTime;
        await this.waitForSeek(video);
        
        const frameData = this.captureFrame(video);
        frames.push({
          data: frameData,
          timestamp: seekTime,
          index: i
        });
      } catch (err) {
        console.error(`Failed to capture frame ${i}:`, err);
      }
    }
    
    // Restore original time
    video.currentTime = currentTime;
    
    return frames;
  }

  /**
   * Wait for video to seek to new position
   */
  waitForSeek(video, timeout = 2000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        reject(new Error('Seek timeout'));
      }, timeout);
      
      const onSeeked = () => {
        clearTimeout(timer);
        resolve();
      };
      
      video.addEventListener('seeked', onSeeked, { once: true });
    });
  }

  /**
   * Prepare frames for backend
   */
  prepareForBackend(frames) {
    return {
      frames: frames.map(f => ({
        image: f.data,
        timestamp: f.timestamp
      })),
      count: frames.length
    };
  }

  /**
   * Get or create canvas element
   */
  getCanvas() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
    }
    return this.canvas;
  }

  /**
   * Detect motion between frames
   */
  detectMotion(frame1, frame2) {
    // Simple pixel difference calculation
    try {
      const canvas = this.getCanvas();
      const ctx = canvas.getContext('2d');
      
      const img1 = new Image();
      const img2 = new Image();
      
      return new Promise((resolve) => {
        let loaded = 0;
        const onLoad = () => {
          loaded++;
          if (loaded === 2) {
            canvas.width = img1.width;
            canvas.height = img1.height;
            
            ctx.drawImage(img1, 0, 0);
            const data1 = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            ctx.drawImage(img2, 0, 0);
            const data2 = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            let diff = 0;
            for (let i = 0; i < data1.data.length; i += 4) {
              diff += Math.abs(data1.data[i] - data2.data[i]);
            }
            
            const avgDiff = diff / (data1.data.length / 4);
            resolve(avgDiff > 10); // Motion threshold
          }
        };
        
        img1.onload = onLoad;
        img2.onload = onLoad;
        img1.src = frame1;
        img2.src = frame2;
      });
    } catch (err) {
      console.error('Motion detection failed:', err);
      return false;
    }
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.FrameProcessor = FrameProcessor;
}

console.log('✅ FrameProcessor loaded');