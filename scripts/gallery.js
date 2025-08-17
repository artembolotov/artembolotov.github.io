/**
 * Universal Gallery Controller
 * Handles all image galleries on the page
 */
class GalleryController {
  constructor() {
    this.galleries = new Map();
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

    // Set up global event delegation
    this.setupEventDelegation();
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
      resizeTimeout: null
    };

    this.galleries.set(galleryId, galleryData);

    // Set up scroll listener for this gallery
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
      });
    });

    // Initial state
    this.updateButtonStates(galleryId);

    console.log('Gallery initialized:', galleryId);
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
    if (!galleryData) return;

    if (galleryData.scrollTimeout) {
      clearTimeout(galleryData.scrollTimeout);
    }
    galleryData.scrollTimeout = setTimeout(() => {
      this.updateButtonStates(galleryId);
    }, 50);
  }

  handleResize(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    if (galleryData.resizeTimeout) {
      clearTimeout(galleryData.resizeTimeout);
    }
    galleryData.resizeTimeout = setTimeout(() => {
      this.updateButtonStates(galleryId);
    }, 100);
  }

  updateButtonStates(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    const { scrollContainer, prevBtn, nextBtn, controlsContainer } = galleryData;
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollWidth = scrollContainer.scrollWidth;
    const clientWidth = scrollContainer.clientWidth;

    // Check if all images fit in the visible area
    const allImagesFit = scrollWidth <= clientWidth + 5; // 5px threshold

    if (allImagesFit) {
      // All images fit - hide entire controls container
      controlsContainer.style.visibility = 'hidden';
    } else {
      // Images don't fit - show controls and update button states
      controlsContainer.style.visibility = 'visible';
      
      // Check if at start or end (with small threshold)
      const atStart = scrollLeft <= 5;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 5;

      // Update button states
      prevBtn.disabled = atStart;
      nextBtn.disabled = atEnd;

      // Visual feedback
      prevBtn.style.opacity = atStart ? '0.3' : '1';
      nextBtn.style.opacity = atEnd ? '0.3' : '1';
    }
  }

  getImageWidth(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return 0;

    const firstImage = galleryData.scrollContainer.querySelector('img');
    if (!firstImage) return galleryData.scrollContainer.clientWidth;

    const imageRect = firstImage.getBoundingClientRect();
    const gap = 8; // 0.5rem gap between images
    return imageRect.width + gap;
  }

  scrollToDirection(galleryId, direction) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    const { scrollContainer } = galleryData;
    const imageWidth = this.getImageWidth(galleryId);
    const currentScroll = scrollContainer.scrollLeft;

    let targetScroll;
    if (direction === 'next') {
      targetScroll = currentScroll + imageWidth;
    } else {
      targetScroll = currentScroll - imageWidth;
    }

    // Ensure we don't scroll beyond bounds
    targetScroll = Math.max(0, Math.min(targetScroll, scrollContainer.scrollWidth - scrollContainer.clientWidth));

    scrollContainer.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }

  // Public method to manually initialize new galleries (useful for dynamic content)
  refresh() {
    this.initializeGalleries();
  }
}

// Initialize gallery controller when script loads
const galleryController = new GalleryController();

// Make it globally available for manual refresh if needed
window.galleryController = galleryController;