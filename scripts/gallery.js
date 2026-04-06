/**
 * Gallery Controller - Simplified for multiple images only
 * Single images should use img.html component
 */

// Disable browser scroll restoration entirely. The gallery uses a nested
// horizontal scroll container, and Safari's async restoration of nested
// scrollers is the root cause of horizontal drift after reload. Owning
// scroll position ourselves removes the fight between the guard and the
// browser, and eliminates the iOS flicker described in the bug.
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  try { history.scrollRestoration = 'manual'; } catch (e) {}
}

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

    if (!scrollContainer || !loadingElement || !contentElement || !controlsContainer) {
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

    // Set loading timeout for emergency fallback
    const timeoutDuration = 10000; // 10 seconds
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
      img.classList.add('loaded');
      this.onImageLoad(galleryId);
      
      // Trigger button state update after image load
      if (galleryData.isLoaded) {
        this.updateButtonStates(galleryId);
      }
    };

    // Function to handle error
    const handleError = () => {
      img.classList.add('loaded', 'error');
      this.onImageLoad(galleryId);
      
      // Trigger button state update even on error
      if (galleryData.isLoaded) {
        this.updateButtonStates(galleryId);
      }
    };

    // Check if image is already loaded
    if (this.isImageLoaded(img)) {
      handleLoad();
      return;
    }

    // Set up load listeners
    img.addEventListener('load', handleLoad, { once: true });
    img.addEventListener('error', handleError, { once: true });
  }

  isImageLoaded(img) {
    const basicCheck = img.complete && 
                      img.naturalWidth > 0 && 
                      img.naturalHeight > 0 && 
                      img.src !== '';
    
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

    // Check if all images are loaded
    if (galleryData.imagesLoaded >= galleryData.totalImages) {
      // Clear the timeout
      if (galleryData.loadingTimeout) {
        clearTimeout(galleryData.loadingTimeout);
        galleryData.loadingTimeout = null;
      }

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

    // Install the "stay on slide #1" guard BEFORE the container becomes
    // scrollable, so listeners are attached before any scroll event can fire.
    this.installFirstSlideGuard(galleryId);

    // Show content — this CSS change makes .image-gallery-inner scrollable
    // (removes overflow:hidden and scroll-snap-type:none from the :not(.loaded) rule)
    galleryData.contentElement.classList.add('loaded');

    // Reset once synchronously after the style change; the guard will catch
    // any later drift (browser scroll-restoration fires asynchronously).
    requestAnimationFrame(() => {
      const sc = galleryData.scrollContainer;
      sc.scrollLeft = 0;
      sc.scrollTo({ left: 0, behavior: 'instant' });

      // Show all loaded images immediately
      const images = sc.querySelectorAll('img.loaded');
      images.forEach(img => { img.style.opacity = '1'; });

      // Set up navigation management
      this.setupNavigationManagement(galleryId);
    });
  }

  installFirstSlideGuard(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || galleryData.guardInstalled) return;
    galleryData.guardInstalled = true;

    const sc = galleryData.scrollContainer;
    let userInteracted = false;
    let isTouching = false;
    let pendingReset = false;
    let rafScheduled = false;
    let touchStartX = 0;
    let touchStartY = 0;
    const pendingTimeouts = [];

    // Coalesced reset. Skips writes when:
    //  - the guard has been released
    //  - scrollLeft is already 0 (no drift to fix)
    //  - the user is currently touching the screen (writing scrollLeft
    //    during an iOS momentum pan interrupts the page scroll engine and
    //    visibly jerks the outer page)
    // While touching, the request is deferred until touchend.
    const flushReset = () => {
      rafScheduled = false;
      if (userInteracted) return;
      if (isTouching) { pendingReset = true; return; }
      if (sc.scrollLeft !== 0) {
        sc.scrollLeft = 0;
      }
    };

    const resetScroll = () => {
      if (userInteracted) return;
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(flushReset);
    };

    const onScroll = () => { resetScroll(); };

    // Real user interaction releases the guard. We only release on
    // *unambiguous horizontal intent* — never on a bare touchstart, since
    // on iOS a vertical page pan that happens to land on the gallery would
    // otherwise release the guard prematurely.
    const releaseGuard = () => {
      if (userInteracted) return;
      userInteracted = true;
      sc.removeEventListener('scroll', onScroll);
      sc.removeEventListener('touchstart', onTouchStart);
      sc.removeEventListener('touchmove', onTouchMove);
      sc.removeEventListener('wheel', onWheel);
      sc.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onWindowTouchStart);
      window.removeEventListener('touchend', onWindowTouchEnd);
      window.removeEventListener('touchcancel', onWindowTouchEnd);
      // Cancel any pending blind resets so they cannot land mid-pan.
      while (pendingTimeouts.length) {
        clearTimeout(pendingTimeouts.pop());
      }
      // Switch the container into snap mode now that the user is engaged.
      sc.classList.add('user-engaged');
    };

    const onWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) releaseGuard();
    };
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') releaseGuard();
    };
    const onTouchStart = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    };
    const onTouchMove = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      const dx = Math.abs(t.clientX - touchStartX);
      const dy = Math.abs(t.clientY - touchStartY);
      if (dx > 6 && dx > dy) releaseGuard();
    };

    // Track whether *any* touch is in progress on the page so we can avoid
    // mutating scrollLeft during iOS momentum scrolling.
    const onWindowTouchStart = () => { isTouching = true; };
    const onWindowTouchEnd = () => {
      isTouching = false;
      if (pendingReset && !userInteracted) {
        pendingReset = false;
        // Defer to next frame so we don't write inside the touchend handler.
        requestAnimationFrame(flushReset);
      }
    };

    sc.addEventListener('scroll', onScroll, { passive: true });
    sc.addEventListener('touchstart', onTouchStart, { passive: true });
    sc.addEventListener('touchmove', onTouchMove, { passive: true });
    sc.addEventListener('wheel', onWheel, { passive: true });
    sc.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onWindowTouchStart, { passive: true });
    window.addEventListener('touchend', onWindowTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onWindowTouchEnd, { passive: true });

    // Expose releaseGuard so the gallery-nav click handler can release on
    // explicit horizontal navigation.
    galleryData.releaseGuard = releaseGuard;

    // Also reset on every late image load — lazy images finishing after
    // showGallery reflow the row and may nudge scrollLeft via snap.
    const imgs = sc.querySelectorAll('img[data-gallery-image]');
    imgs.forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', resetScroll, { once: true });
        img.addEventListener('error', resetScroll, { once: true });
      }
    });

    // Single immediate reset; with history.scrollRestoration = 'manual'
    // the long blind timeout chain is no longer needed.
    pendingTimeouts.push(setTimeout(resetScroll, 0));
  }

  setupNavigationManagement(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData) return;

    // Debounced update function
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

    // Listen for scroll events
    galleryData.scrollContainer.addEventListener('scroll', debouncedUpdate);
    
    // Listen for resize events
    window.addEventListener('resize', debouncedUpdate);

    // Use ResizeObserver for accurate size change detection
    const resizeObserver = new ResizeObserver(debouncedUpdate);
    resizeObserver.observe(galleryData.scrollContainer);

    // Initial update
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.updateButtonStates(galleryId);
      });
    });

    // Fallback update
    setTimeout(() => {
      this.updateButtonStates(galleryId);
    }, 100);
  }

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
    // Handle all gallery button clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('.gallery-nav')) {
        e.preventDefault();
        const button = e.target.closest('.gallery-nav');
        const galleryId = button.getAttribute('data-gallery');
        const direction = button.getAttribute('data-direction');
        
        if (galleryId && direction && !button.disabled) {
          const gd = this.galleries.get(galleryId);
          if (gd && typeof gd.releaseGuard === 'function') gd.releaseGuard();
          this.scrollToDirection(galleryId, direction);
        }
      }
    });
  }

  updateButtonStates(galleryId) {
    const galleryData = this.galleries.get(galleryId);
    if (!galleryData || !galleryData.isLoaded) return;

    const { scrollContainer, prevBtn, nextBtn, controlsContainer } = galleryData;
    
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollWidth = scrollContainer.scrollWidth;
    const clientWidth = scrollContainer.clientWidth;

    // Check if all images fit in the visible area
    const allImagesFit = scrollWidth <= clientWidth + 5;

    if (allImagesFit) {
      // All images fit - hide controls
      controlsContainer.classList.remove('visible');
    } else {
      // Images don't fit - show controls and update button states
      controlsContainer.classList.add('visible');
      
      // Check if at start or end
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

  // Public method for external use
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