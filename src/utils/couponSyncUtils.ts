// src/utils/couponSyncUtils.ts
import CouponFileService from '../services/CouponFileService';

/**
 * Utility functions for synchronizing coupon data across components
 */
export const couponSyncUtils = {
  /**
   * Notify all components that a coupon has been created
   */
  notifyCouponCreated: (coupon: any) => {
    document.dispatchEvent(new CustomEvent('couponCreated', { 
      detail: { coupon } 
    }));
  },

  /**
   * Notify all components that a coupon has been updated
   */
  notifyCouponUpdated: (couponId: string) => {
    document.dispatchEvent(new CustomEvent('couponUpdated', { 
      detail: { couponId } 
    }));
  },

  /**
   * Notify all components that a coupon has been deleted
   */
  notifyCouponDeleted: (couponId: string) => {
    document.dispatchEvent(new CustomEvent('couponDeleted', { 
      detail: { couponId } 
    }));
  },
  
  /**
   * Sync coupons from ProductContext to CouponFileService
   */
  syncCoupons: async (coupons: any[]) => {
    try {
      const success = await CouponFileService.saveCouponsToFile(coupons);
      if (success) {
        console.log('Coupons synced to file successfully');
        // Dispatch event for components to refresh
        document.dispatchEvent(new CustomEvent('couponsUpdated', { 
          detail: { coupons } 
        }));
      } else {
        console.error('Failed to sync coupons to file');
      }
      return success;
    } catch (error) {
      console.error('Error syncing coupons to file:', error);
      return false;
    }
  }
};
