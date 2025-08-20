/**
 * Gallery Controller with Instant Display
 * Clean, minimal implementation focused on core functionality
 */
class GalleryController {
  constructor() {
    this.galleries = new Map();
    this.eventDelegationSetup = false;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeGalleries());
    } else {
      this.initializeGalleries();
    }
  }

  initializeGalleries() {
    // Find all galleries on the page
    const galleryElements = document.querySelectorAll('.image-gallery');
    let autoIdCounter = 1;
    
    galleryElements.forEach(gallery => {
      let galleryId = gallery.getAttribute('data-gallery-id');
      
      // Generate unique ID for auto galleries
      if (galleryId === 'gallery-auto') {
        galleryId = 'gallery-' + autoIdCounter++;
        gallery.setAttribute('data-gallery-id', galleryId);
        
        // Update button data-gallery attributes
        const buttons = gallery.querySelectorAll('.gallery-nav');
        buttons.forEach(btn => btn.setAttribute('data-gallery', galleryId));
      }
      
      if (galleryId && !this.galleries.has(galleryId)) {
        this.initializeGallery(gallery, galleryId);
      }
    });

    // Set up global event delegation ONLY ONCE
    if (!this.eventDelegationSetup) {
      this.setupEventDelegation();
      this.eventDelegationSetup = true;
    }
  }

  initializeGallery(galleryElement, galleryId) {
    const scrollContainer = galleryElement.querySelector('.image-gallery-inner');
    const prevBtn = galleryElement.querySelector('.gallery-prev');
    const nextBtn = galleryElement.querySelector('.gallery-next');
    const controlsContainer = galleryElement.querySelector('.gallery-controls');
    const loadingElement = galleryElement.querySelector('.gallery-loading');
    const contentElement = galleryElement.querySelector('.gallery-content');
    const progressBar = galleryElement.querySelector('.gallery-loading-bar');

    if (!scrollContainer || !loadingElement || !contentElement) {
      console.warn('Gallery elements not found for:', galleryId);
      return;
    }

    scrollContainer.scrollLeft = 0;

    // Store gallery data
    const galleryData = {
      element: galleryElement,
      scrollContainer: scrollContainer,
      prevBtn: prevBtn,
      nextBtn: nextBtn,
      controlsContainer: controlsContainer,
      loadingElement: loadingElement,
      contentElement: contentElement,
      progressBar: progressBar,
      scrollTimeout: null,
      resizeTimeout: null,
      loadingTimeout: null,
      imagesLoaded: 0,
      totalImages: 0,
      isLoaded: false
    };

    this.galleries.set(galleryId, galleryData);

    // Start loading process immediately
    this.setupImageLoading(galleryId);

    console.log(`Gallery initialized: ${galleryId}`);
  }

  setupImageLoading(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    const images = galleryData.scrollContainer.querySelectorAll('img[data-gallery-image]');
    galleryData.totalImages = images.length;
    galleryData.imagesLoaded = 0;

    // If no images, show gallery immediately
    if (galleryData.totalImages === 0) {
      this.showGallery(galleryId);
      return;
    }

    // Set loading timeout for emergency fallback
    const timeoutDuration = 10000; // 10 seconds for all galleries
    galleryData.loadingTimeout = setTimeout(() => {
      this.showGallery(galleryId);
    }, timeoutDuration);

    // Check each image independently
    images.forEach((img, index) => {
      this.setupImageLoadListener(img, index, galleryId);
    });

    // Initial progress update
    this.updateProgress(galleryId);
  }

  setupImageLoadListener(img, index, galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    // Function to handle successful load
    const handleLoad = () => {
      // Mark image as loaded but keep it hidden until gallery shows
      img.classList.add('loaded');
      
      this.onImageLoad(galleryId);
      
      // Trigger button state update after image load (for cases where gallery is already shown)
      if (galleryData.isLoaded) {
        this.updateButtonStates(galleryId);
      }
    };

    // Function to handle error
    const handleError = () => {
      // Mark as loaded with error state
      img.classList.add('loaded', 'error');
      
      this.onImageLoad(galleryId);
      
      // Trigger button state update even on error
      if (galleryData.isLoaded) {
        this.updateButtonStates(galleryId);
      }
    };

    // Check if image is already loaded
    if (this.isImageLoaded(img)) {
      // Image is already loaded
      handleLoad();
      return;
    }

    // Set up load listeners
    img.addEventListener('load', handleLoad, { once: true });
    img.addEventListener('error', handleError, { once: true });
  }

  isImageLoaded(img) {
    // Multiple checks to ensure image is actually loaded
    const basicCheck = img.complete && 
                      img.naturalWidth > 0 && 
                      img.naturalHeight > 0 && 
                      img.src !== '';
    
    // If image is loaded, mark it but don't show yet
    if (basicCheck && !img.classList.contains('loaded')) {
      img.classList.add('loaded');
    }
    
    return basicCheck;
  }

  onImageLoad(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || galleryData.isLoaded) return;

    galleryData.imagesLoaded++;
    this.updateProgress(galleryId);

    // Check if all images are loaded - show immediately if so
    if (galleryData.imagesLoaded >= galleryData.totalImages) {
      // Clear the timeout
      if (galleryData.loadingTimeout) {
        clearTimeout(galleryData.loadingTimeout);
        galleryData.loadingTimeout = null;
      }

      // Show gallery immediately - no delays
      this.showGallery(galleryId);
    }
  }

  updateProgress(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || !galleryData.progressBar) return;

    const progress = galleryData.totalImages > 0 
      ? (galleryData.imagesLoaded / galleryData.totalImages) * 100 
      : 100;

    galleryData.progressBar.style.width = `${progress}%`;

    // Update counter
    const loadedCountElement = galleryData.element.querySelector('.gallery-loaded-count');
    if (loadedCountElement) {
      loadedCountElement.textContent = galleryData.imagesLoaded;
    }
  }

  showGallery(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || galleryData.isLoaded) return;

    // Mark as loaded
    galleryData.isLoaded = true;
    galleryData.element.classList.add('loaded');

    // Show content immediately - no transition delays
    galleryData.contentElement.classList.add('loaded');

    // Show all loaded images immediately
    const images = galleryData.scrollContainer.querySelectorAll('img.loaded');
    images.forEach(img => {
      img.style.opacity = '1';
    });

    // Set up event-based button state management
    this.setupButtonStateManagement(galleryId);

    // Set up scroll and resize listeners
    if (galleryData.scrollContainer) {
      const debouncedUpdate = this.debounce(() => {
        this.updateButtonStates(galleryId);
      }, 10);
      
      galleryData.scrollContainer.addEventListener('scroll', debouncedUpdate);
      window.addEventListener('resize', debouncedUpdate);
    }
  }

  setupButtonStateManagement(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    // Debounced update function to avoid excessive calls
    const debouncedUpdate = this.debounce(() => {
      this.updateButtonStates(galleryId);
    }, 50);

    // Listen for image load events (in case some images load after gallery shows)
    const images = galleryData.scrollContainer.querySelectorAll('img[data-gallery-image]');
    images.forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', debouncedUpdate, { once: true });
        img.addEventListener('error', debouncedUpdate, { once: true });
      }
    });

    // Listen for transition end events on gallery content
    galleryData.contentElement.addEventListener('transitionend', (e) => {
      if (e.target === galleryData.contentElement) {
        debouncedUpdate();
      }
    });

    // Use ResizeObserver for accurate size change detection
    const resizeObserver = new ResizeObserver(debouncedUpdate);
    resizeObserver.observe(galleryData.scrollContainer);

    // Fallback: Use requestAnimationFrame for next frame update
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.updateButtonStates(galleryId);
      });
    });

    // Additional fallback: Update after a short delay
    setTimeout(() => {
      this.updateButtonStates(galleryId);
    }, 100);
  }

  // Utility debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  setupEventDelegation() {
    // Use event delegation to handle all gallery button clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('.gallery-nav')) {
        e.preventDefault();
        const button = e.target.closest('.gallery-nav');
        const galleryId = button.getAttribute('data-gallery');
        const direction = button.getAttribute('data-direction');
        
        if (galleryId && direction && !button.disabled) {
          this.scrollToDirection(galleryId, direction);
        }
      }
    });
  }

  handleScroll(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || !galleryData.isLoaded) return;

    if (galleryData.scrollTimeout) {
      clearTimeout(galleryData.scrollTimeout);
    }
    galleryData.scrollTimeout = setTimeout(() => {
      this.updateButtonStates(galleryId);
    }, 10);
  }

  handleResize(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || !galleryData.isLoaded) return;

    if (galleryData.resizeTimeout) {
      clearTimeout(galleryData.resizeTimeout);
    }
    galleryData.resizeTimeout = setTimeout(() => {
      this.updateButtonStates(galleryId);
    }, 25);
  }

  updateButtonStates(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || !galleryData.isLoaded || !galleryData.controlsContainer) return;

    const { scrollContainer, prevBtn, nextBtn, controlsContainer } = galleryData;
    
    // Wait for layout to be stable
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollWidth = scrollContainer.scrollWidth;
    const clientWidth = scrollContainer.clientWidth;

    // Check if all images fit in the visible area (with small threshold)
    const allImagesFit = scrollWidth <= clientWidth + 5;

    if (allImagesFit) {
      // All images fit - hide controls
      controlsContainer.classList.remove('visible');
    } else {
      // Images don't fit - show controls and update button states
      controlsContainer.classList.add('visible');
      
      // Check if at start or end (with small threshold)
      const atStart = scrollLeft <= 5;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 5;

      // Update button states
      if (prevBtn) {
        prevBtn.disabled = atStart;
        prevBtn.style.opacity = atStart ? '0.3' : '1';
      }
      
      if (nextBtn) {
        nextBtn.disabled = atEnd;
        nextBtn.style.opacity = atEnd ? '0.3' : '1';
      }
    }
  }

  scrollToDirection(galleryId, direction) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || !galleryData.isLoaded) return;

    const { scrollContainer } = galleryData;
    const scrollAmount = scrollContainer.clientWidth * 0.5;
    const currentScroll = scrollContainer.scrollLeft;

    let targetScroll;
    if (direction === 'next') {
      targetScroll = currentScroll + scrollAmount;
    } else {
      targetScroll = currentScroll - scrollAmount;
    }

    // Ensure we don't scroll beyond bounds
    targetScroll = Math.max(0, Math.min(targetScroll, scrollContainer.scrollWidth - scrollContainer.clientWidth));

    scrollContainer.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }

  // Public methods for external use
  getGalleryStats(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return null;

    return {
      totalImages: galleryData.totalImages,
      loadedImages: galleryData.imagesLoaded,
      loadingProgress: galleryData.totalImages > 0 ? (galleryData.imagesLoaded / galleryData.totalImages) * 100 : 100,
      isLoaded: galleryData.isLoaded,
      isScrollable: galleryData.isLoaded && galleryData.scrollContainer.scrollWidth > galleryData.scrollContainer.clientWidth
    };
  }
}

// Initialize gallery controller
const galleryController = new GalleryController();

// Make it globally available
window.galleryController = galleryController;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GalleryController;
}