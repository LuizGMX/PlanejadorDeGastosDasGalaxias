/**
 * iOS support utilities
 * Functions to handle iOS-specific issues and device detection
 */

/**
 * Detect if the current device is running iOS
 * @returns {boolean} True if iOS device is detected
 */
export const isIOS = () => {
  return (
    ['iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
};

/**
 * Detect if the device is an iOS device with a notch (iPhone X or newer)
 * @returns {boolean} True if notched iOS device is detected
 */
export const isNotchedIOS = () => {
  // Check if it's iOS first
  if (!isIOS()) return false;
  
  // iPhone X dimensions or newer
  const minHeight = 812;
  const minWidth = 375;
  
  return window.screen.height >= minHeight && window.screen.width >= minWidth;
};

/**
 * Set CSS viewport height variable for iOS devices
 * This fixes the 100vh issue on iOS Safari
 */
export const setVHVariable = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

/**
 * Apply iOS specific classes to the document body
 */
export const applyIOSClasses = () => {
  if (isIOS()) {
    document.body.classList.add('ios-device');
    
    if (isNotchedIOS()) {
      document.body.classList.add('ios-notched');
    }
  }
};

/**
 * Initialize all iOS support features
 * Call this function once when the app starts
 */
export const initIOSSupport = () => {
  applyIOSClasses();
  setVHVariable();
  
  // Handle resize events to update the vh variable
  window.addEventListener('resize', () => {
    setVHVariable();
  });
  
  // Handle orientation change specifically
  window.addEventListener('orientationchange', () => {
    // Small delay to ensure the resize has completed
    setTimeout(() => {
      setVHVariable();
    }, 100);
  });
};

export default {
  isIOS,
  isNotchedIOS,
  setVHVariable,
  applyIOSClasses,
  initIOSSupport
}; 