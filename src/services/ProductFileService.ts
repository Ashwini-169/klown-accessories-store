// This service will handle updating the products.json file via API calls

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

class ProductFileService {
  // Keep track of last sync timestamp to prevent too frequent syncs
  private static lastSyncTime = 0;
  private static isSyncing = false;
  private static minSyncInterval = 5000; // 5 seconds
  
  // Save products to the file via API, with rate limiting
  static async saveProductsToFile(products: any[], filePath: string = 'src/data/products.json'): Promise<boolean> {
    try {
      // Rate limiting to prevent too frequent API calls
      const now = Date.now();
      if (this.isSyncing) {
        console.log('[ProductFileService] Already syncing, skipping...');
        return true;
      }
      
      if (now - this.lastSyncTime < this.minSyncInterval && products.length === 0) {
        console.log(`[ProductFileService] Synced too recently, skipping... (${(now - this.lastSyncTime) / 1000}s since last sync)`);
        return true;
      }
      
      this.isSyncing = true;
      this.lastSyncTime = now;
      
      // Ensure we're sending a valid array of products
      if (!Array.isArray(products)) {
        console.error('[ProductFileService] Invalid products data:', products);
        this.isSyncing = false;
        return false;
      }
      
      console.log(`[ProductFileService] Saving ${products.length} products to ${filePath}`);
      
      // Make a deep copy of the products to avoid reference issues
      const productsCopy = JSON.parse(JSON.stringify(products));
      
      // Call our API endpoint using the current hostname
      const hostname = window.location.hostname;
      const apiUrl = `http://${hostname}:3001/api/products/save`;
      console.log(`[ProductFileService] Sending request to ${apiUrl} with ${productsCopy.length} products`);
      console.log('[ProductFileService] Products being saved:', productsCopy.map((p: any) => p.id));
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productsCopy })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ProductFileService] API response was not ok:', errorText);
        this.isSyncing = false;
        return false;
      }
      
      const result = await response.json();
      console.log('[ProductFileService] API response:', result);
      
      this.isSyncing = false;
      return result.success;
    } catch (error) {
      console.error('[ProductFileService] Failed to save products to file:', error);
      this.isSyncing = false;
      return false;
    }
  }
  
  // Update stock for a specific product size
  static async updateStock(productId: string, size: string, stock: number): Promise<boolean> {
    try {
      console.log(`[ProductFileService] Updating stock for product ${productId}, size ${size} to ${stock}`);
      
      // Call our API endpoint for stock update
      const hostname = window.location.hostname;
      const apiUrl = `http://${hostname}:3001/api/products/stock`;
      
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, size, stock })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ProductFileService] Stock update API response was not ok:', errorText);
        return false;
      }
      
      const result = await response.json();
      console.log('[ProductFileService] Stock update API response:', result);
      
      return result.success;
    } catch (error) {
      console.error('[ProductFileService] Failed to update product stock:', error);
      return false;
    }
  }
  
  // Direct delete product method
  static async deleteProduct(productId: string): Promise<boolean> {
    console.log(`[ProductFileService] Attempting to delete product with ID: ${productId}`);
    
    // Add retry logic for better resilience
    let retries = 3;
    let lastError: Error | null = null;
    
    while (retries > 0) {
      try {
        // Call our API endpoint for direct product deletion
        const hostname = window.location.hostname;
        const apiUrl = `http://${hostname}:3001/api/products/${productId}`;
        console.log(`[ProductFileService] Sending DELETE request to ${apiUrl} (retries left: ${retries})`);
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        const response = await fetch(apiUrl, {
          method: 'DELETE',
          signal: controller.signal
        });
        
        // Clear timeout since request completed
        clearTimeout(timeoutId);
        
        console.log(`[ProductFileService] DELETE request status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[ProductFileService] API response for deletion was not ok:', errorText);
          
          // Check if it's a 404 - if so, assume product is already deleted
          if (response.status === 404) {
            console.log('[ProductFileService] Product not found (404). Assuming already deleted.');
            return true; // Consider this a success case
          }
          
          throw new Error(`API responded with ${response.status}: ${response.statusText}. Details: ${errorText}`);
        }
        
        const responseText = await response.text();
        console.log(`[ProductFileService] Raw response: ${responseText}`);
        
        let result;
        try {
          result = responseText ? JSON.parse(responseText) : { success: true };
        } catch (parseError) {
          console.error('[ProductFileService] Failed to parse JSON response:', parseError);
          
          // If the response was OK but not valid JSON, still consider it a success
          if (response.ok) {
            console.log('[ProductFileService] Response was OK but not valid JSON, considering deletion successful');
            return true;
          }
          
          throw new Error(`Invalid JSON response: ${responseText}`);
        }
        
        if (result && result.success) {
          console.log(`[ProductFileService] Product ${productId} deleted successfully, remaining products: ${result.remainingProductsCount || 'unknown'}`);
          
          // Dispatch event to notify components that a product was deleted
          document.dispatchEvent(new CustomEvent('productDeleted', { 
            detail: { 
              productId, 
              deletedProduct: result.deletedProduct || { id: productId }
            } 
          }));
          
          // Trigger a refresh to ensure all components are in sync
          setTimeout(() => this.refreshProducts(), 500);
          
          return true;
        } else {
          const message = result?.message || 'Unknown error';
          console.error('[ProductFileService] API reported failure in response:', message);
          throw new Error(`API reported failure: ${message}`);
        }
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[ProductFileService] Error during delete (retries left: ${retries}):`, error);
        retries--;
        
        if (retries > 0) {
          console.log(`[ProductFileService] Retrying delete in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }
    
    // If we get here, all retries failed
    console.error('[ProductFileService] All delete retries failed for product:', productId);
    
    // Attempt to refresh products from server as a last resort
    try {
      await this.refreshProducts();
    } catch (refreshError) {
      console.error('[ProductFileService] Failed to refresh products after delete failure:', refreshError);
    }
    
    throw lastError || new Error('Failed to delete product after multiple retries');
  }
  
  // Fetch products from API and return them
  static async fetchProductsFromAPI(): Promise<any[]> {
    try {
      console.log('[ProductFileService] Fetching products from API');
      const hostname = window.location.hostname;
      const response = await fetch(`http://${hostname}:3001/api/products`);
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`[ProductFileService] Successfully fetched ${data.data.length} products`);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('[ProductFileService] Error fetching products:', error);
      return [];
    }
  }
  
  // Refresh products and notify components
  static async refreshProducts(): Promise<boolean> {
    try {
      const products = await this.fetchProductsFromAPI();
      
      if (products && products.length > 0) {
        // Dispatch event to notify components of refresh
        document.dispatchEvent(new CustomEvent('productsRefreshed', { 
          detail: { products } 
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ProductFileService] Error refreshing products:', error);
      return false;
    }
  }
  
  // Initialize event listeners with debounced handler
  static init() {
    // Create a debounced event handler for product data changes
    const debouncedSaveHandler = debounce(async (data: any, path: string) => {
      await this.saveProductsToFile(data, path);
    }, 2000);
    
    // Add the event listener
    window.addEventListener('productDataChanged', async (e: any) => {
      const { data, path } = e.detail;
      debouncedSaveHandler(data, path);
    });
    
    console.log('[ProductFileService] Initialized with debounced handlers');
  }
}

// Initialize the service when this module is imported
ProductFileService.init();

export default ProductFileService;
