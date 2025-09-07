import { useState, useEffect, useRef } from 'react';

// Simple debounce function
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

// This custom hook extends useLocalStorage to also persist data to a JSON file
export function useLocalStorageWithFileSync<T>(
  key: string,
  initialValue: T,
  filePath: string
): [T, (value: T | ((val: T) => T)) => void] {
  // Get from local storage then parse stored json
  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);
  const prevValueRef = useRef<T>(storedValue);

  // Handle file sync with debouncing to prevent too frequent API calls
  const syncWithFile = useRef(
    debounce(async (newValue: T) => {
      try {
        console.log(`Syncing to ${filePath}:`, newValue);
        
        // Dispatch an event that will be handled by ProductFileService
        const event = new CustomEvent('productDataChanged', { detail: { data: newValue, path: filePath } });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to sync with file:', error);
      }
    }, 2000) // 2000ms (2 seconds) debounce time to prevent rapid refreshes
  ).current;

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
      
      // Only sync with file if there's a meaningful change
      // This prevents unnecessary API calls and refreshes
      const currentValueString = JSON.stringify(valueToStore);
      const prevValueString = JSON.stringify(prevValueRef.current);
      
      if (currentValueString !== prevValueString) {
        // Use the debounced sync to prevent rapid file changes
        syncWithFile(valueToStore);
        prevValueRef.current = JSON.parse(currentValueString);
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Listen for changes to the product data from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const newValue = JSON.parse(e.newValue);
          setStoredValue(newValue);
          prevValueRef.current = newValue;
        } catch (error) {
          console.error('Failed to parse storage value:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
