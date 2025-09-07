// src/utils/productSyncUtils.ts
import ProductFileService from '../services/ProductFileService';

/**
 * Utility functions for synchronizing product data across components
 */
export const productSyncUtils = {
  /**
   * Notify all components that a product has been created
   */
  notifyProductCreated: (product: any) => {
    document.dispatchEvent(new CustomEvent('productCreated', { 
      detail: { product } 
    }));
  },

  /**
   * Notify all components that a product has been updated
   */
  notifyProductUpdated: (productId: string) => {
    document.dispatchEvent(new CustomEvent('productUpdated', { 
      detail: { productId } 
    }));
  },
  
  /**
   * Notify all components that product stock has changed
   */
  notifyStockChanged: (productId: string, size: string, newStock: number, changeType?: string) => {
    document.dispatchEvent(new CustomEvent('productStockUpdated', { 
      detail: { 
        productId,
        size,
        newStock,
        changeType
      } 
    }));
    
    // Also update the file via API if enabled
    try {
      ProductFileService.updateStock(productId, size, newStock)
        .catch(error => console.error('Failed to save stock update to file:', error));
    } catch (error) {
      console.error('Error calling ProductFileService.updateStock:', error);
    }
  },
  
  /**
   * Sync products from ProductContext to ProductFileService
   */
  syncProducts: async (products: any[]) => {
    try {
      const success = await ProductFileService.saveProductsToFile(products);
      if (success) {
        console.log('Products synced to file successfully');
      } else {
        console.error('Failed to sync products to file');
      }
      return success;
    } catch (error) {
      console.error('Error syncing products to file:', error);
      return false;
    }
  }
};
