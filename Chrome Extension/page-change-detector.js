// page-change-detector.js - Monitor DOM changes on the page

class PageChangeDetector {
  constructor() {
    this.observer = null;
    this.lastSnapshot = null;
    this.changes = {
      addedNodes: [],
      removedNodes: [],
      modifiedText: false,
      newImages: [],
      newLinks: []
    };
    this.monitoring = false;
  }

  /**
   * Start monitoring page changes
   */
  startMonitoring() {
    if (this.monitoring) {
      console.log('Already monitoring');
      return;
    }

    console.log('🔍 Starting page change detection...');
    this.monitoring = true;
    this.takeSnapshot();
    
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.monitoring = false;
    console.log('🛑 Stopped page change detection');
  }

  /**
   * Take snapshot of current page state
   */
  takeSnapshot() {
    this.lastSnapshot = {
      textContent: document.body.innerText,
      imageCount: document.images.length,
      imageSrcs: Array.from(document.images).map(img => img.src),
      linkCount: document.links.length,
      timestamp: Date.now()
    };
    
    // Reset changes
    this.changes = {
      addedNodes: [],
      removedNodes: [],
      modifiedText: false,
      newImages: [],
      newLinks: []
    };
  }

  /**
   * Handle DOM mutations
   */
  handleMutations(mutations) {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.changes.addedNodes.push(node);
            
            // Check for new images
            if (node.tagName === 'IMG') {
              this.changes.newImages.push(node.src);
            } else if (node.querySelectorAll) {
              const imgs = node.querySelectorAll('img');
              imgs.forEach(img => this.changes.newImages.push(img.src));
            }
            
            // Check for new links
            if (node.tagName === 'A') {
              this.changes.newLinks.push(node.href);
            }
          }
        });
        
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.changes.removedNodes.push(node);
          }
        });
      } else if (mutation.type === 'characterData') {
        this.changes.modifiedText = true;
      }
    });
  }

  /**
   * Detect significant changes since last snapshot
   */
  detectChanges() {
    if (!this.lastSnapshot) {
      return { hasChanges: false, summary: 'No baseline snapshot' };
    }

    const currentText = document.body.innerText;
    const currentImages = Array.from(document.images).map(img => img.src);
    
    // Check text changes
    const textChanged = currentText.length !== this.lastSnapshot.textContent.length ||
                        currentText !== this.lastSnapshot.textContent;
    
    // Check new images
    const newImages = currentImages.filter(src => 
      !this.lastSnapshot.imageSrcs.includes(src)
    );
    
    // Check if significant changes occurred
    const hasChanges = 
      this.changes.addedNodes.length > 0 ||
      this.changes.removedNodes.length > 0 ||
      newImages.length > 0 ||
      (textChanged && Math.abs(currentText.length - this.lastSnapshot.textContent.length) > 100);
    
    if (hasChanges) {
      const summary = this.generateChangeSummary(newImages.length);
      
      // Take new snapshot
      this.takeSnapshot();
      
      return {
        hasChanges: true,
        summary: summary,
        details: {
          nodesAdded: this.changes.addedNodes.length,
          nodesRemoved: this.changes.removedNodes.length,
          newImages: newImages.length,
          textModified: textChanged
        },
        newImageUrls: newImages.slice(0, 3) // Max 3 images
      };
    }
    
    return {
      hasChanges: false,
      summary: 'No significant changes detected'
    };
  }

  /**
   * Generate human-readable change summary
   */
  generateChangeSummary(newImageCount) {
    const parts = [];
    
    if (this.changes.addedNodes.length > 0) {
      parts.push(`${this.changes.addedNodes.length} new elements added`);
    }
    
    if (this.changes.removedNodes.length > 0) {
      parts.push(`${this.changes.removedNodes.length} elements removed`);
    }
    
    if (newImageCount > 0) {
      parts.push(`${newImageCount} new images appeared`);
    }
    
    if (this.changes.modifiedText) {
      parts.push('text content updated');
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Page content changed';
  }

  /**
   * Get list of new images
   */
  getNewImages() {
    if (!this.lastSnapshot) return [];
    
    const currentImages = Array.from(document.images)
      .map(img => img.src)
      .filter(src => src.startsWith('http'));
    
    return currentImages.filter(src => 
      !this.lastSnapshot.imageSrcs.includes(src)
    );
  }

  /**
   * Get extracted text from new nodes
   */
  getNewText() {
    return this.changes.addedNodes
      .map(node => node.innerText || node.textContent || '')
      .filter(text => text.trim().length > 20)
      .join(' ')
      .substring(0, 1000);
  }

  /**
   * Reset detector
   */
  reset() {
    this.changes = {
      addedNodes: [],
      removedNodes: [],
      modifiedText: false,
      newImages: [],
      newLinks: []
    };
    this.takeSnapshot();
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.PageChangeDetector = PageChangeDetector;
}

console.log('✅ PageChangeDetector loaded');