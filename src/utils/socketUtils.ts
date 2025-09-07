// In a new file src/utils/socketUtils.ts
import { io } from 'socket.io-client';
import { cacheUtils } from './cacheUtils';

// Use the current hostname or IP dynamically
const hostname = window.location.hostname;
const socket = io(`http://${hostname}:3001`);

export const initializeSocketListeners = () => {
  // Listen for product data changes from other clients
  socket.on('productChanged', () => {
    console.log('[Socket] Received product data change notification');
    cacheUtils.clearCacheAndReload();
  });
  
  // Listen for coupon data changes from other clients
  socket.on('couponChanged', () => {
    console.log('[Socket] Received coupon data change notification');
    cacheUtils.clearCacheAndReload();
  });
  
  // Listen for banner data changes from other clients
  socket.on('bannerChanged', () => {
    console.log('[Socket] Received banner data change notification');
    cacheUtils.clearCacheAndReload();
  });
};