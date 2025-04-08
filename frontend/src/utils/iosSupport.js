/**
 * iOS support utilities
 * Functions to handle iOS-specific issues and device detection
 */

/**
 * Detect if the current device is running iOS
 * @returns {boolean} True if iOS device is detected
 */
export const isIOS = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) || 
         (userAgent.includes('mac') && 'ontouchend' in document);
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
  if (isIOS()) {
    console.log('iOS device detected, initializing support...');
    
    // Adicionar classes específicas para iOS
    document.documentElement.classList.add('ios-device');
    document.body.classList.add('ios-device');
    
    // Adicionar meta viewport com viewport-fit=cover para suporte a safe-area
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    }
    
    // Adicionar CSS para garantir que a navbar seja exibida corretamente
    const style = document.createElement('style');
    style.textContent = `
      .ios-device .mobileNavbar {
        display: block !important;
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 1000 !important;
        padding-bottom: env(safe-area-inset-bottom, 0) !important;
        -webkit-transform: translateZ(0) !important;
        transform: translateZ(0) !important;
        -webkit-backface-visibility: hidden !important;
        backface-visibility: hidden !important;
      }
      
      .ios-device .mobileNavbar.ios-navbar {
        display: block !important;
      }
      
      .ios-device main {
        padding-bottom: calc(60px + env(safe-area-inset-bottom, 0));
      }
      
      @supports (-webkit-touch-callout: none) {
        .ios-device {
          min-height: -webkit-fill-available;
        }
        
        .ios-device .mobileNavbar {
          position: fixed !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Forçar exibição da navbar
    const navbarElement = document.querySelector('.mobileNavbar');
    if (navbarElement) {
      navbarElement.style.display = 'block';
      navbarElement.classList.add('ios-navbar');
      console.log('Forced mobile navbar display for iOS device');
    }
    
    // Adicionar event listeners para garantir que a navbar seja exibida corretamente
    window.addEventListener('resize', () => {
      const navbarElement = document.querySelector('.mobileNavbar');
      if (navbarElement) {
        navbarElement.style.display = 'block';
      }
    });
    
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        const navbarElement = document.querySelector('.mobileNavbar');
        if (navbarElement) {
          navbarElement.style.display = 'block';
        }
      }, 100);
    });
  }
};

export default {
  isIOS,
  isNotchedIOS,
  setVHVariable,
  applyIOSClasses,
  initIOSSupport
}; 