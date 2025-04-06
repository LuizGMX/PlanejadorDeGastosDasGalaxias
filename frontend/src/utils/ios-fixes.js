/**
 * iOS-specific fixes and utilities
 * This file contains various fixes for iOS Safari issues
 */

/**
 * Detects if the device is running iOS
 * @returns {boolean} true if the device is iOS
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Adds iOS-specific body classes
 */
export const addIOSClasses = () => {
  if (isIOS()) {
    document.body.classList.add('ios-device');
    
    // Add specific classes for different iOS versions if needed
    const iosVersion = getIOSVersion();
    if (iosVersion) {
      document.body.classList.add(`ios-${iosVersion.major}`);
      
      // Add class for notched devices (iPhone X and newer)
      if ((iosVersion.major >= 11 && /iPhone/.test(navigator.userAgent)) ||
          (iosVersion.major >= 12)) {
        document.body.classList.add('ios-notched');
      }
    }
  }
};

/**
 * Gets the iOS version
 * @returns {Object|null} iOS version object with major, minor, patch properties
 */
export const getIOSVersion = () => {
  const ua = navigator.userAgent;
  const matches = ua.match(/(iPhone|iPad|iPod).* OS (\d+)_(\d+)_?(\d+)?/);
  
  if (matches && matches.length >= 4) {
    return {
      major: parseInt(matches[2], 10),
      minor: parseInt(matches[3], 10),
      patch: parseInt(matches[4] || 0, 10)
    };
  }
  
  // For newer iPads on iPadOS (which reports as MacIntel)
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    // This is iPad on iPadOS, but we can't reliably get the version
    // Assume at least iOS 13
    return {
      major: 13,
      minor: 0,
      patch: 0
    };
  }
  
  return null;
};

/**
 * Fixes iOS input focus issues (viewport jumping, zoom, etc.)
 * Call this in component mounts or in app initialization
 */
export const fixIOSInputs = () => {
  if (!isIOS()) return;
  
  // Fix for viewport jumping when keyboard appears
  const viewportFix = () => {
    // Force redraw to fix scroll position
    document.body.style.display = 'none';
    document.body.offsetHeight;
    document.body.style.display = '';
    
    // Scroll back to top of focused element
    setTimeout(() => {
      if (document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || 
           document.activeElement.tagName === 'TEXTAREA' || 
           document.activeElement.tagName === 'SELECT')) {
        document.activeElement.scrollIntoView({ block: 'center' });
      }
    }, 300);
  };
  
  // Add listeners for input focus/blur
  document.addEventListener('focus', (e) => {
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.tagName === 'SELECT') {
      // Prevent zoom on focus by ensuring font size is at least 16px
      e.target.style.fontSize = '16px';
      viewportFix();
    }
  }, true);
  
  document.addEventListener('blur', (e) => {
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.tagName === 'SELECT') {
      // Delay to ensure keyboard is fully hidden
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 300);
    }
  }, true);
  
  // Fix iOS momentum scrolling in fixed position containers
  const fixedElements = document.querySelectorAll('.modal, .formModal, .mobileSubmenu');
  fixedElements.forEach(el => {
    el.addEventListener('touchstart', () => {
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const height = el.clientHeight;
      
      if (scrollTop === 0) {
        el.scrollTop = 1;
      } else if (scrollTop + height === scrollHeight) {
        el.scrollTop = scrollTop - 1;
      }
    }, false);
  });
};

/**
 * Fix for iOS Safari 100vh issue
 * Mobile Safari doesn't handle 100vh correctly, this fixes it
 */
export const fixIOSVh = () => {
  if (!isIOS()) return;
  
  const setVhProperty = () => {
    // Set a CSS variable with the actual viewport height
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  setVhProperty();
  
  // Update on resize and orientation change
  window.addEventListener('resize', setVhProperty);
  window.addEventListener('orientationchange', setVhProperty);
};

/**
 * Initialize all iOS fixes
 * Call this function in your app's entry point
 */
export const initIOSFixes = () => {
  addIOSClasses();
  fixIOSInputs();
  fixIOSVh();
};

export default initIOSFixes; 