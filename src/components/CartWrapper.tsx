import React, { useState, useEffect } from 'react';
import { isLowPoweredDevice } from '../utils/mobileOptimizations';
import CartOptimized from './Cart.low';
import CartRegular from './Cart';

interface CartWrapperProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Cart Wrapper component that chooses between optimized and regular cart
 * based on device capabilities
 */
const CartWrapper: React.FC<CartWrapperProps> = (props) => {
  const [isLowPower, setIsLowPower] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if device is low-powered
    setIsLowPower(isLowPoweredDevice());
  }, []);
  
  // Render the appropriate cart component based on device capabilities
  if (isLowPower) {
    return <CartOptimized {...props} />;
  }
  
  return <CartRegular {...props} />;
};

export default CartWrapper;
