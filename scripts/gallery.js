/**
 * Enhanced Gallery Controller with Instant Display
 * No delays - galleries show immediately when all images are loaded
 * All galleries use consistent lazy loading
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

    console.log(`Found ${galleryElements.length} galleries for initialization`);

    // Set up global event delegation ONLY ONCE
    if (!this.eventDelegationSetup) {
      this.setupEventDelegation();
      this.eventDelegationSetup = true;
    }
  }

  initializeLowPriorityGalleries() {
    // Use Intersection Observer for better performance if available
    if ('IntersectionObserver' in window) {
      this.setupIntersectionObserver();
    } else {
      // Fallback: initialize immediately
      this.lowPriorityGalleries.forEach(({ element, id }) => {
        this.initializeGallery(element, id);
      });
    }
  }

  setupIntersectionObserver() {
    const observerOptions = {
      root: null,
      rootMargin: '100px', // Start loading when gallery is 100px from viewport
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const gallery = entry.target;
          const galleryId = gallery.getAttribute('data-gallery-id');
          
          if (galleryId && !this.galleries.has(galleryId)) {
            console.log(`Initializing low-priority gallery on scroll: ${galleryId}`);
            this.initializeGallery(gallery, galleryId);
            observer.unobserve(gallery); // Stop observing once initialized
          }
        }
      });
    }, observerOptions);

    // Observe all low priority galleries
    this.lowPriorityGalleries.forEach(({ element }) => {
      observer.observe(element);
    });
  }

  initializeGallery(galleryElement, galleryId) {
    const scrollContainer = galleryElement.querySelector('.image-gallery-inner');
    const prevBtn = galleryElement.querySelector('.gallery-prev');
    const nextBtn = galleryElement.querySelector('.gallery-next');
    const controlsContainer = galleryElement.querySelector('.gallery-controls');
    const loadingElement = galleryElement.querySelector('.gallery-loading');
    const contentElement = galleryElement.querySelector('.gallery-content');
    const progressBar = galleryElement.querySelector('.gallery-loading-bar');
    const priority = galleryElement.getAttribute('data-gallery-priority') || 'low';

    if (!scrollContainer || !loadingElement || !contentElement) {
      console.warn('Gallery elements not found for:', galleryId);
      return;
    }

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
      priority: priority,
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

    console.log(`Gallery initialized: ${galleryId} (priority: ${priority})`);
  }

  setupImageLoading(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    const images = galleryData.scrollContainer.querySelectorAll('img[data-gallery-image]');
    galleryData.totalImages = images.length;
    galleryData.imagesLoaded = 0;

    console.log(`Setting up loading for ${galleryData.totalImages} images in gallery: ${galleryId}`);

    // If no images, show gallery immediately
    if (galleryData.totalImages === 0) {
      this.showGallery(galleryId);
      return;
    }

    // Set loading timeout for emergency fallback
    const timeoutDuration = 10000; // 10 seconds for all galleries
    galleryData.loadingTimeout = setTimeout(() => {
      console.warn(`Force showing gallery ${galleryId} after timeout`);
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
      console.log(`Image ${index + 1} loaded for gallery: ${galleryId}`);
      
      // Mark image as loaded but keep it hidden until gallery shows
      img.classList.add('loaded');
      
      this.onImageLoad(galleryId);
    };

    // Function to handle error
    const handleError = () => {
      console.warn(`Image ${index + 1} failed to load for gallery: ${galleryId}`);
      
      // Mark as loaded with error state
      img.classList.add('loaded', 'error');
      
      this.onImageLoad(galleryId); // Still count as "loaded" to not block gallery
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

    console.log(`Gallery ${galleryId}: ${galleryData.imagesLoaded}/${galleryData.totalImages} images loaded`);

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

    console.log(`Showing gallery: ${galleryId}`);

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

    // Set up scroll and resize listeners
    if (galleryData.scrollContainer) {
      galleryData.scrollContainer.addEventListener('scroll', () => {
        this.handleScroll(galleryId);
      });
    }

    window.addEventListener('resize', () => {
      this.handleResize(galleryId);
    });

    // Update button states immediately
    this.updateButtonStates(galleryId);
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
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollWidth = scrollContainer.scrollWidth;
    const clientWidth = scrollContainer.clientWidth;

    // Check if all images fit in the visible area
    const allImagesFit = scrollWidth <= clientWidth + 5; // 5px threshold

    if (allImagesFit) {
      // All images fit - keep controls hidden
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

  // Public methods
  refresh() {
    this.initializeGalleries();
  }

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

  forceShowGallery(galleryId) {
    this.showGallery(galleryId);
  }

  // Force show all galleries (fallback method)
  forceShowAllGalleries() {
    this.galleries.forEach((galleryData, galleryId) => {
      if (!galleryData.isLoaded) {
        console.log(`Force showing gallery: ${galleryId}`);
        this.showGallery(galleryId);
      }
    });
  }

  // Performance monitoring method
  getPerformanceStats() {
    const stats = {
      totalGalleries: this.galleries.size,
      loadedGalleries: 0,
      totalImages: 0,
      loadedImages: 0
    };

    this.galleries.forEach(galleryData => {
      if (galleryData.isLoaded) stats.loadedGalleries++;
      stats.totalImages += galleryData.totalImages;
      stats.loadedImages += galleryData.imagesLoaded;
    });

    return stats;
  }
}

// Initialize gallery controller
const galleryController = new GalleryController();

// Make it globally available
window.galleryController = galleryController;

// Performance monitoring (optional)
if (window.performance && window.performance.mark) {
  window.performance.mark('gallery-controller-initialized');
}

// Fallback: if galleries still not shown after 10 seconds, force show them all
setTimeout(() => {
  if (window.galleryController) {
    const stats = window.galleryController.getPerformanceStats();
    console.log('Gallery performance stats:', stats);
    
    if (stats.loadedGalleries < stats.totalGalleries) {
      console.warn('Some galleries not loaded after 10s, forcing show all');
      window.galleryController.forceShowAllGalleries();
    }
  }
}, 10000);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GalleryController;
}