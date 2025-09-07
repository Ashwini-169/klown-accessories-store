// This service will handle updating the coupons.json file via API calls

// Reuse the debounce utility from ProductFileService
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

class CouponFileService {
  // Keep track of last sync timestamp to prevent too frequent syncs
  private static lastSyncTime = 0;
  private static isSyncing = false;
  private static minSyncInterval = 2000; // 2 seconds
  
  // Save coupons to the file via API, with rate limiting
  static async saveCouponsToFile(coupons: any[], filePath: string = 'src/data/coupons.json'): Promise<boolean> {
    try {
      // Rate limiting to prevent too frequent API calls
      const now = Date.now();
      if (this.isSyncing) {
        console.log('[CouponFileService] Already syncing, skipping...');
        return true;
      }
      
      if (now - this.lastSyncTime < this.minSyncInterval && coupons.length === 0) {
        console.log(`[CouponFileService] Synced too recently, skipping... (${(now - this.lastSyncTime) / 1000}s since last sync)`);
        return true;
      }
      
      this.isSyncing = true;
      this.lastSyncTime = now;
      
      // Ensure we're sending a valid array of coupons
      if (!Array.isArray(coupons)) {
        console.error('[CouponFileService] Invalid coupons data:', coupons);
        this.isSyncing = false;
        return false;
      }
      
      console.log(`[CouponFileService] Saving ${coupons.length} coupons to ${filePath}`);
      
      try {
        // Make a deep copy of the coupons to avoid reference issues
        const couponsCopy = JSON.parse(JSON.stringify(coupons));
        
        // Call the server API to save the file
        console.log(`[CouponFileService] Making API request to /api/savefile with ${couponsCopy.length} coupons`);
    const hostname = window.location.hostname;
    const apiUrl = `http://${hostname}:3001/api/savefile`;
    
    console.log('[CouponFileService] Sending data:', {
      filePath,
      couponCount: couponsCopy.length,
      firstFewIds: couponsCopy.length > 0 ? couponsCopy.slice(0, 3).map((c: any) => c.id).join(', ') : 'none'
    });
    
    const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath: filePath,
            data: couponsCopy
          }),
        });
        
  const responseText = await response.text();
        console.log(`[CouponFileService] Raw API response: ${responseText}`);
        
        if (!response.ok) {
          throw new Error(`API responded with ${response.status}: ${response.statusText}. Details: ${responseText}`);
        }
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.warn(`[CouponFileService] Could not parse response as JSON: ${responseText}`);
          // If we can't parse as JSON but the response was OK, we'll still consider it successful
          if (response.ok) {
            result = { success: true };
          } else {
            throw new Error(`Invalid JSON response: ${responseText}`);
          }
        }
        
        if (!result.success) {
          throw new Error(`API reported failure: ${result.message || 'Unknown error'}`);
        }
        
        this.isSyncing = false;
        console.log('[CouponFileService] Sync completed successfully:', result);
        return true;
      } catch (apiError) {
        console.error('[CouponFileService] API call failed:', apiError);
        this.isSyncing = false;
        throw apiError; // Re-throw to be caught by the outer catch block
      }
    } catch (error) {
      console.error('[CouponFileService] Error saving coupons to file:', error);
      this.isSyncing = false;
      
      // Show error in console with more details
      if (error instanceof Error) {
        console.error('[CouponFileService] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      return false;
    }
  }
  
  // Helper function to properly format coupon data for saving
  static prepareCouponsForSave(coupons: any[]): any[] {
    return coupons.map(coupon => ({
      ...coupon,
      // Ensure date fields are properly formatted as ISO strings
      validUntil: typeof coupon.validUntil === 'object' && coupon.validUntil instanceof Date 
        ? coupon.validUntil.toISOString().split('T')[0]
        : coupon.validUntil
    }));
  }
  
  // Debounced version for frequent calls
  static debouncedSaveCouponsToFile = debounce(this.saveCouponsToFile, 1000);
}

export default CouponFileService;
