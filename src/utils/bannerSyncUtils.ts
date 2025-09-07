// src/utils/bannerSyncUtils.ts
import BannerFileService from '../services/BannerFileService';

/**
 * Utility functions for synchronizing banner data across components
 */
export const bannerSyncUtils = {
  /**
   * Notify all components that the banner has been updated
   */
  notifyBannerUpdated: (bannerUrl: string) => {
    document.dispatchEvent(new CustomEvent('bannerUpdated', { 
      detail: { bannerUrl } 
    }));
  },
  
  /**
   * Sync banner data to banneradmin.json
   */
  syncBanner: async (bannerData: any) => {
    try {
      const success = await BannerFileService.saveBannerToFile(bannerData);
      if (success) {
        console.log('Banner data synced to file successfully');
        // Dispatch event for components to refresh
        document.dispatchEvent(new CustomEvent('bannerUpdated', { 
          detail: { banner: bannerData } 
        }));
      } else {
        console.error('Failed to sync banner data to file');
      }
      return success;
    } catch (error) {
      console.error('Error syncing banner data to file:', error);
      return false;
    }
  }
};
