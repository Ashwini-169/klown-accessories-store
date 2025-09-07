import React, { useEffect } from 'react';
import { applyLowPowerOptimizations } from '../utils/mobileOptimizations';

/**
 * Component that optimizes the Cart for low-powered devices
 * Add this to the top level of your app
 */
const CartOptimizer: React.FC = () => {
  useEffect(() => {
    applyLowPowerOptimizations();
  }, []);
  
  return null; // This is a utility component that doesn't render anything
};

export default CartOptimizer;
