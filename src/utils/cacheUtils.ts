// src/utils/cacheUtils.ts
import Cookies from 'js-cookie';

/**
 * Utility to clear cache and cookies when data files are updated
 */
export const cacheUtils = {
  /**
   * Clear browser cache and cookies for the application and reload
   */
  clearCacheAndReload: () => {
    console.log('[CacheUtils] Clearing cache and cookies due to data file changes');
    
    try {
      // Clear all cookies except admin authentication if user is logged in
      const isAdminLoggedIn = !!Cookies.get('admin_authenticated');
      
      // Get all cookies
      const allCookies = document.cookie.split(';');
      
      // Remove all cookies except admin auth if it exists
      for (const cookie of allCookies) {
        const cookieName = cookie.split('=')[0].trim();
        if (cookieName !== 'admin_authenticated' && cookieName !== 'admin_session') {
          Cookies.remove(cookieName);
        }
      }
      
      // Clear localStorage items except admin related
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.includes('admin_')) {
          localStorage.removeItem(key);
        }
      }
      
      // Clear sessionStorage items except admin related
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && !key.includes('admin_')) {
          sessionStorage.removeItem(key);
        }
      }
      
      console.log('[CacheUtils] Cache and cookies cleared, reloading page');
      
      // Reload the page with cache busting query parameter
      window.location.reload();
    } catch (error) {
      console.error('[CacheUtils] Error clearing cache:', error);
    }
  },
  
  /**
   * Set up file change listeners
   */
  setupFileChangeListeners: () => {
    console.log('[CacheUtils] Setting up file change listeners');
    
    // Listen for product data changes
    document.addEventListener('productDataChanged', () => {
      console.log('[CacheUtils] Detected product data change');
      setTimeout(() => cacheUtils.clearCacheAndReload(), 2000); // Delay to allow save to complete
    });
    
    // Listen for coupon data changes
    document.addEventListener('couponsUpdated', () => {
      console.log('[CacheUtils] Detected coupon data change');
      setTimeout(() => cacheUtils.clearCacheAndReload(), 2000); // Delay to allow save to complete
    });
    
    // Listen for banner data changes
    document.addEventListener('bannerDataChanged', () => {
      console.log('[CacheUtils] Detected banner data change');
      setTimeout(() => cacheUtils.clearCacheAndReload(), 2000); // Delay to allow save to complete
    });
  }
};
