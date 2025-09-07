// src/utils/optimizationUtils.ts
/**
 * Utility functions for optimizing the website performance
 */

/**
 * Preloads key resources and sets up performance optimizations
 */
export const initializeOptimizations = () => {
  // Add connection preload for critical resources
  addPreloadLinks();
  
  // Set up lazy loading for images below the fold
  setupLazyLoading();
  
  // Set up performance metrics monitoring
  monitorPerformance();
};

/**
 * Adds preload links for critical resources
 */
const addPreloadLinks = () => {
  const preloads = [
    // Preload main hero image
    { href: 'https://images.pexels.com/photos/8838877/pexels-photo-8838877.jpeg?auto=compress&cs=tinysrgb&w=800', as: 'image' },
    // Add DNS prefetch for external resources
    { href: 'https://fonts.googleapis.com', as: 'dns-prefetch' },
    { href: 'https://images.pexels.com', as: 'dns-prefetch' }
  ];

  preloads.forEach(({ href, as }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    if (as === 'dns-prefetch') {
      link.rel = 'dns-prefetch';
    }
    
    document.head.appendChild(link);
  });
};

/**
 * Sets up lazy loading for images
 */
const setupLazyLoading = () => {
  // Use native lazy loading for images (modern browsers support this)
  document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
      if (img.classList.contains('critical')) return; // Skip critical images
      img.setAttribute('loading', 'lazy');
    });
  });
};

/**
 * Monitors performance metrics to identify bottlenecks
 */
const monitorPerformance = () => {
  if ('performance' in window && 'getEntriesByType' in window.performance) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = window.performance.getEntriesByType('navigation')[0];
        console.log('Page load performance:', perfData);
        
        // Report key metrics
        const metrics = {
          TTFB: Math.round(perfData.responseStart),
          FCP: 0,
          LCP: 0
        };
        
        // Log metrics
        console.log('Performance metrics:', metrics);
      }, 1000);
    });
  }
};

/**
 * Optimizes images by providing correct sized versions based on device
 * @param originalSrc Original image source
 * @param isMobile Whether the device is mobile
 * @returns Optimized image source
 */
export const getOptimizedImageSrc = (originalSrc: string, isMobile: boolean): string => {
  // If using an external service like Cloudinary, Imgix, etc.,
  // you can construct optimal URLs here
  
  if (originalSrc.includes('pexels.com')) {
    // For Pexels images, append size parameters
    const width = isMobile ? 400 : 800;
    if (originalSrc.includes('?')) {
      return `${originalSrc}&w=${width}&auto=compress`;
    } else {
      return `${originalSrc}?w=${width}&auto=compress`;
    }
  }
  
  return originalSrc;
};
