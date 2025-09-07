/**
 * Utility functions to optimize the UI for low-powered devices
 */

/**
 * Detects if the device is likely a low-powered device
 * Uses various signals including memory, device class, and browser capabilities
 */
export function isLowPoweredDevice(): boolean {
  try {
    // @ts-ignore - deviceMemory is not in standard TS types
    const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
    
    // Check for older Android devices
    const isOlderAndroid = /Android [4-7]/.test(navigator.userAgent);
    
    // Check for limited heap size (Chrome-specific)
    // @ts-ignore - Chrome-specific memory API
    const hasLimitedHeap = window.performance && 
      'memory' in window.performance && 
      // @ts-ignore
      window.performance.memory.jsHeapSizeLimit < 2147483648;
    
    // Check for low-end devices via userAgent patterns
    const isLowEndDevice = 
      /Android.*Mobile/.test(navigator.userAgent) ||
      /Windows Phone/.test(navigator.userAgent) ||
      /iPhone OS [789]_/.test(navigator.userAgent);

    return hasLowMemory || isOlderAndroid || hasLimitedHeap || isLowEndDevice;
  } catch (err) {
    console.log('Error detecting device capabilities:', err);
    return false;
  }
}

/**
 * Applies optimizations for low-powered devices
 */
export function applyLowPowerOptimizations(): void {
  if (isLowPoweredDevice()) {
    document.body.classList.add('low-powered-device');
    
    // Add optimizations for low-powered devices
    const style = document.createElement('style');
    style.textContent = `
      .low-powered-device .cart-animation { 
        transition: none !important; 
        animation: none !important;
      }
      .low-powered-device .cart-shadow { 
        box-shadow: none !important; 
      }
      .low-powered-device .cart-gradient { 
        background-image: none !important;
        background-color: #f97316 !important;
      }
      .low-powered-device .cart-modal {
        z-index: 9999 !important;
        transform: translateZ(0) !important;
      }
      .low-powered-device img {
        image-rendering: optimize-speed !important;
      }
      .low-powered-device .animated {
        animation: none !important;
        transition: none !important;
      }
      .low-powered-device .complex-effect {
        display: none !important;
      }
      .low-powered-device .blur-effect,
      .low-powered-device .backdrop-blur {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
    `;
    
    document.head.appendChild(style);
    
    // Reduce animation frame rate for smoother performance
    if (window.requestAnimationFrame) {
      const originalRAF = window.requestAnimationFrame;
      let lastTime = 0;
      
      window.requestAnimationFrame = function(callback) {
        const currentTime = Date.now();
        if (currentTime - lastTime < 32) { // Limit to ~30fps instead of 60fps
          return setTimeout(() => {
            lastTime = Date.now();
            callback(lastTime);
          }, 32); // ~30fps
        }
        
        lastTime = currentTime;
        return originalRAF(callback);
      };
    }
    
    // Reduce image quality for better performance
    document.querySelectorAll('img').forEach(img => {
      if (img.src && !img.src.includes('placeholder')) {
        img.loading = 'lazy';
        img.decoding = 'async';
      }
    });
    
    console.log('Low-power device optimizations applied');
  }
}
