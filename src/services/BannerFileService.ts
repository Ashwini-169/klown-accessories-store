// This service will handle updating the banneradmin.json file via API calls

// Reuse the debounce utility
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

class BannerFileService {
  // Keep track of last sync timestamp to prevent too frequent syncs
  private static lastSyncTime = 0;
  private static isSyncing = false;
  private static minSyncInterval = 2000; // 2 seconds
  
  // Save banner data to the file via API
  static async saveBannerToFile(bannerData: any, filePath: string = 'src/data/banneradmin.json'): Promise<boolean> {
    try {
      // Rate limiting to prevent too frequent API calls
      const now = Date.now();
      if (this.isSyncing) {
        console.log('[BannerFileService] Already syncing, skipping...');
        return true;
      }
      
      if (now - this.lastSyncTime < this.minSyncInterval) {
        console.log(`[BannerFileService] Synced too recently, skipping... (${(now - this.lastSyncTime) / 1000}s since last sync)`);
        return true;
      }
      
      this.isSyncing = true;
      this.lastSyncTime = now;
      
      // Ensure we're sending valid data
      if (!bannerData) {
        console.error('[BannerFileService] Invalid banner data:', bannerData);
        this.isSyncing = false;
        return false;
      }
      
      console.log(`[BannerFileService] Saving banner data to ${filePath}`);
      
      try {
        // Make a deep copy of the data to avoid reference issues
        const dataCopy = JSON.parse(JSON.stringify(bannerData));
        
        // Call the server API to save the file
  console.log(`[BannerFileService] Making API request to /api/savefile with banner data`);
  const hostname = window.location.hostname;
  const apiUrl = `http://${hostname}:3001/api/savefile`;
  const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath: filePath,
            data: dataCopy
          }),
        });
        
        const responseText = await response.text();
        console.log(`[BannerFileService] Raw API response: ${responseText}`);
        
        if (!response.ok) {
          throw new Error(`API responded with ${response.status}: ${response.statusText}. Details: ${responseText}`);
        }
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.warn(`[BannerFileService] Could not parse response as JSON: ${responseText}`);
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
        console.log('[BannerFileService] Sync completed successfully:', result);
        return true;
      } catch (apiError) {
        console.error('[BannerFileService] API call failed:', apiError);
        this.isSyncing = false;
        throw apiError;
      }
    } catch (error) {
      console.error('[BannerFileService] Error saving banner data to file:', error);
      this.isSyncing = false;
      return false;
    }
  }
  
  // Debounced version for frequent calls
  static debouncedSaveBannerToFile = debounce(this.saveBannerToFile, 1000);
}

export default BannerFileService;
