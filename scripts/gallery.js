/**
 * Simplified Gallery Controller with Loading State
 * Shows galleries only after all images are fully loaded
 * No complex aspect ratio calculations needed
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
      console.log('Gallery elements not found for:', galleryId);
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
      scrollTimeout: null,
      resizeTimeout: null,
      imagesLoaded: 0,
      totalImages: 0,
      isLoaded: false
    };

    this.galleries.set(galleryId, galleryData);

    // Start loading process
    this.setupImageLoading(galleryId);

    console.log('Gallery initialized:', galleryId);
  }

  setupImageLoading(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    const images = galleryData.scrollContainer.querySelectorAll('img[data-gallery-image]');
    galleryData.totalImages = images.length;
    galleryData.imagesLoaded = 0;

    console.log(`Loading ${galleryData.totalImages} images for gallery:`, galleryId);

    // If no images, show gallery immediately
    if (galleryData.totalImages === 0) {
      this.showGallery(galleryId);
      return;
    }

    // Set up image loading
    images.forEach((img, index) => {
      if (img.complete && img.naturalHeight !== 0) {
        // Image already loaded
        this.onImageLoad(galleryId);
      } else {
        // Set up load listeners
        img.addEventListener('load', () => {
          console.log(`Image ${index + 1} loaded for gallery:`, galleryId);
          this.onImageLoad(galleryId);
        });
        
        img.addEventListener('error', () => {
          console.warn(`Image ${index + 1} failed to load for gallery:`, galleryId);
          this.onImageLoad(galleryId); // Still count as "loaded" to not block gallery
        });

        // Force loading if src is not set
        if (!img.src && (img.getAttribute('src') || img.dataset.src)) {
          img.src = img.getAttribute('src') || img.dataset.src;
        }
      }
    });

    // Initial progress update
    this.updateProgress(galleryId);
  }

  onImageLoad(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || galleryData.isLoaded) return;

    galleryData.imagesLoaded++;
    this.updateProgress(galleryId);

    // Check if all images are loaded
    if (galleryData.imagesLoaded >= galleryData.totalImages) {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        this.showGallery(galleryId);
      }, 100);
    }
  }

  updateProgress(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || !galleryData.progressBar) return;

    const progress = galleryData.totalImages > 0 
      ? (galleryData.imagesLoaded / galleryData.totalImages) * 100 
      : 100;

    galleryData.progressBar.style.width = `${progress}%`;
  }

  showGallery(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || galleryData.isLoaded) return;

    console.log('Showing gallery:', galleryId);

    // Mark as loaded
    galleryData.isLoaded = true;
    galleryData.element.classList.add('loaded');

    // Show content with smooth transition
    galleryData.contentElement.classList.add('loaded');

    // Set up scroll and resize listeners after gallery is shown
    if (galleryData.scrollContainer) {
      galleryData.scrollContainer.addEventListener('scroll', () => {
        this.handleScroll(galleryId);
      });
    }

    window.addEventListener('resize', () => {
      this.handleResize(galleryId);
    });

    // Initial state setup - wait for transition to complete
    setTimeout(() => {
      this.updateButtonStates(galleryId);
    }, 500);
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
      controlsContainer.style.visibility = 'hidden';
    } else {
      // Images don't fit - show controls and update button states
      controlsContainer.style.visibility = 'visible';
      
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
}

// Initialize gallery controller
const galleryController = new GalleryController();

// Make it globally available
window.galleryController = galleryController;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GalleryController;
}