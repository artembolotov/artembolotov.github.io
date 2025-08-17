class GalleryController {
  constructor() {
    this.galleries = new Map();
    this.eventDelegationSetup = false;
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeGalleries());
    } else {
      this.initializeGalleries();
    }
  }

  initializeGalleries() {
    const galleryElements = document.querySelectorAll('.image-gallery');
    let autoIdCounter = 1;
    
    galleryElements.forEach(gallery => {
      let galleryId = gallery.getAttribute('data-gallery-id');
      
      if (galleryId === 'gallery-auto') {
        galleryId = 'gallery-' + autoIdCounter++;
        gallery.setAttribute('data-gallery-id', galleryId);
        
        const buttons = gallery.querySelectorAll('.gallery-nav');
        buttons.forEach(btn => btn.setAttribute('data-gallery', galleryId));
      }
      
      if (galleryId && !this.galleries.has(galleryId)) {
        this.initializeGallery(gallery, galleryId);
      }
    });

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

    if (!scrollContainer || !prevBtn || !nextBtn || !controlsContainer) {
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
      scrollTimeout: null,
      resizeTimeout: null,
      isPreloaded: false  // Add preload flag
    };

    this.galleries.set(galleryId, galleryData);

    // IMPORTANT: Preload scroll mechanism
    this.preloadScroll(galleryId);

    // Set up scroll listener
    scrollContainer.addEventListener('scroll', () => {
      this.handleScroll(galleryId);
    });

    // Set up resize listener
    window.addEventListener('resize', () => {
      this.handleResize(galleryId);
    });

    // Set up image load listeners
    const images = scrollContainer.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('load', () => {
        this.updateButtonStates(galleryId);
        // Re-preload after images load
        if (!galleryData.isPreloaded) {
          this.preloadScroll(galleryId);
        }
      });
    });

    // Initial state
    this.updateButtonStates(galleryId);

    console.log('Gallery initialized:', galleryId);
  }

  // New method: Preload scroll to initialize browser's scroll mechanism
  preloadScroll(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    const { scrollContainer } = galleryData;
    
    // Micro-scroll to initialize scroll-snap and smooth scrolling
    requestAnimationFrame(() => {
      // Save current position
      const originalPosition = scrollContainer.scrollLeft;
      
      // Do a tiny scroll forward and back
      scrollContainer.scrollLeft = 1;
      
      requestAnimationFrame(() => {
        scrollContainer.scrollLeft = originalPosition;
        galleryData.isPreloaded = true;
      });
    });
  }

  setupEventDelegation() {
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
    if (!galleryData) return;

    if (galleryData.scrollTimeout) {
      clearTimeout(galleryData.scrollTimeout);
    }
    galleryData.scrollTimeout = setTimeout(() => {
      this.updateButtonStates(galleryId);
    }, 10);
  }

  handleResize(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    if (galleryData.resizeTimeout) {
      clearTimeout(galleryData.resizeTimeout);
    }
    galleryData.resizeTimeout = setTimeout(() => {
      this.updateButtonStates(galleryId);
      // Re-preload after resize
      this.preloadScroll(galleryId);
    }, 25);
  }

  updateButtonStates(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    const { scrollContainer, prevBtn, nextBtn, controlsContainer } = galleryData;
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollWidth = scrollContainer.scrollWidth;
    const clientWidth = scrollContainer.clientWidth;

    const allImagesFit = scrollWidth <= clientWidth + 5;

    if (allImagesFit) {
      controlsContainer.style.visibility = 'hidden';
    } else {
      controlsContainer.style.visibility = 'visible';
      
      const atStart = scrollLeft <= 5;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 5;

      prevBtn.disabled = atStart;
      nextBtn.disabled = atEnd;

      prevBtn.style.opacity = atStart ? '0.3' : '1';
      nextBtn.style.opacity = atEnd ? '0.3' : '1';
    }
  }

  scrollToDirection(galleryId, direction) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    const { scrollContainer, isPreloaded } = galleryData;
    
    // If not preloaded, do it now
    if (!isPreloaded) {
      this.preloadScroll(galleryId);
      // Delay the actual scroll slightly
      setTimeout(() => {
        this.performScroll(scrollContainer, direction);
      }, 50);
    } else {
      this.performScroll(scrollContainer, direction);
    }
  }

  performScroll(scrollContainer, direction) {
    const scrollAmount = scrollContainer.clientWidth * 0.5;
    const currentScroll = scrollContainer.scrollLeft;

    let targetScroll;
    if (direction === 'next') {
      targetScroll = currentScroll + scrollAmount;
    } else {
      targetScroll = currentScroll - scrollAmount;
    }

    targetScroll = Math.max(0, Math.min(targetScroll, 
      scrollContainer.scrollWidth - scrollContainer.clientWidth));

    scrollContainer.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }

  refresh() {
    this.initializeGalleries();
  }
}

// Initialize gallery controller when script loads
const galleryController = new GalleryController();

// Make it globally available for manual refresh if needed
window.galleryController = galleryController;