import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag, ArrowRight, ChevronLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
import Checkout from './Checkout';
import Bill from './Bill';
import type { Coupon } from '../types';
import { isLowPoweredDevice } from '../utils/mobileOptimizations';

// We'll define helper functions directly in the component instead of using interfaces

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose }) => {
  // Step management: 0 = Cart, 1 = Bill Summary, 2 = Checkout
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [recommendedCoupons, setRecommendedCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  // State for recommended coupons
  const [showBillPrompt, setShowBillPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLowPower, setIsLowPower] = useState(false);
  
  // Check if device is mobile and/or low-powered
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
      setIsLowPower(isLowPoweredDevice());
    };
    
    // Initial check
    checkDevice();
    
    // Add listener for window resize
    window.addEventListener('resize', checkDevice);
    
    // Clean up
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const { items, removeFromCart, updateQuantity, getTotalPrice, clearCart, getTotalItems } = useCart();
  const { products, coupons } = useProducts();
  
  // Listen for checkout event from Bill component
  useEffect(() => {
    const handleCheckout = () => setCurrentStep(2); // Set step to Checkout
    window.addEventListener('proceedToCheckout', handleCheckout);
    return () => window.removeEventListener('proceedToCheckout', handleCheckout);
  }, []);
  
  // Show bill prompt when items change
  useEffect(() => {
    if (items.length > 0 && !isLowPower) { // Skip animations on low-power devices
      setShowBillPrompt(true);
      // Auto-hide prompt after 5 seconds
      const timer = setTimeout(() => {
        setShowBillPrompt(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [items.length, isLowPower]);
  
  // Find applicable coupons whenever cart items change
  useEffect(() => {
    if (items.length > 0 && coupons.length > 0) {
      // Filter active coupons
      const activeCoupons = coupons.filter(coupon => coupon.active);
      
      // Simple recommendation algorithm
      const recommended = activeCoupons.filter(coupon => {
        // For percentage or fixed discounts that have a minimum amount requirement
        if ((coupon.type === 'percentage' || coupon.type === 'fixed') && coupon.minAmount) {
          return getTotalPrice() >= coupon.minAmount;
        }
        
        // For special "buy X get Y" promotions
        if (coupon.type === 'special' && coupon.specialType === 'buyXgetY' && coupon.buyQuantity) {
          return items.length >= coupon.buyQuantity;
        }
        
        return false;
      });
      
      // Only sort if not low power (sorting is expensive)
      if (!isLowPower) {
        // Sort by potential savings (most savings first)
        recommended.sort((couponA: Coupon, couponB: Coupon) => {
          const totalPrice = getTotalPrice();
          const savingsA = calculateSavings(couponA, totalPrice);
          const savingsB = calculateSavings(couponB, totalPrice);
          return savingsB - savingsA;
        });
      }
      
      setRecommendedCoupons(recommended);
    } else {
      setRecommendedCoupons([]);
      setSelectedCoupon(null);
    }
  }, [coupons, items, getTotalPrice, getTotalItems, products, isLowPower]);
  
  // Helper function to calculate potential savings from a coupon
  const calculateSavings = (coupon: Coupon, subtotal: number): number => {
    if (coupon.type === 'percentage' && coupon.minAmount !== undefined && subtotal >= coupon.minAmount) {
      return Math.min((subtotal * coupon.discount) / 100, coupon.maxDiscount || Number.MAX_VALUE);
    } else if (coupon.type === 'fixed' && coupon.minAmount !== undefined && subtotal >= coupon.minAmount) {
      return Math.min(coupon.discount, coupon.maxDiscount || Number.MAX_VALUE);
    } else if (coupon.type === 'special' && coupon.specialType === 'buyXgetY') {
      // For special buy X get Y coupons, estimate based on lowest priced items
      if (items.length >= (coupon.buyQuantity || 0)) {
        // More efficient calculation for low-power devices
        if (isLowPower) {
          const minPrice = Math.min(...items.map(item => item.price));
          const freeItemsCount = Math.min(
            coupon.getQuantity || 0,
            Math.floor(items.length / (coupon.buyQuantity || 1)) * (coupon.getQuantity || 0)
          );
          return minPrice * freeItemsCount;
        }
        
        // Full calculation for normal devices
        const sortedItems = [...items].sort((a, b) => a.price - b.price);
        const freeItemsCount = Math.min(
          coupon.getQuantity || 0,
          Math.floor(items.length / (coupon.buyQuantity || 1)) * (coupon.getQuantity || 0)
        );
        
        let savings = 0;
        for (let i = 0; i < freeItemsCount && i < sortedItems.length; i++) {
          savings += sortedItems[i].price;
        }
        return savings;
      }
    }
    return 0;
  };

  // No need for handleCopyCode as it was removed

  const getProductDetails = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  if (!isOpen) return null;

  // Return appropriate component based on current step
  if (currentStep === 2) { // Checkout step
    // discount already managed in context/Bill, no need to compute here
    return <Checkout onClose={() => { setCurrentStep(0); onClose(); }} />;
  }

  // Modal CSS classes based on device capability
  const modalClasses = `absolute ${isMobile ? 'inset-0' : 'right-0 top-0 h-full w-full max-w-md'} 
    bg-white overflow-y-auto z-[9999] ${!isLowPower ? 'cart-shadow' : ''}`;
  
  // Type-safe styles
  const modalStyles: React.CSSProperties = isLowPower ? 
    { willChange: 'transform', backfaceVisibility: 'hidden' as 'hidden' } : 
    { transform: 'translateZ(0)' };
  
  const buttonClasses = `w-full ${isLowPower ? 'bg-orange-500' : 'bg-gradient-to-r from-yellow-400 to-orange-500 cart-gradient'} 
    text-black ${isMobile ? 'py-2.5 text-sm' : 'py-3'} rounded-md font-medium 
    flex items-center justify-center ${!isLowPower ? 'hover:from-yellow-300 hover:to-orange-400 transition-all cart-shadow' : ''}`;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Step 1: Cart Modal */}
      {currentStep === 0 && (
        <div className={modalClasses} style={modalStyles}>
          <div className="flex flex-col h-full">
            <div className={`flex items-center justify-between ${isMobile ? 'p-3' : 'p-4'} border-b sticky top-0 z-10 bg-white`}>
              {isMobile ? (
                <>
                  <button onClick={onClose} className="p-1">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-lg font-bold text-gray-900">Shopping Cart</h2>
                  <div className="w-5"></div> {/* Empty div for flex spacing */}
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900">Your Shopping Cart</h2>
                  <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3' : 'p-4'}`}>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <ShoppingBag className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} text-gray-300`} />
                  <p className={`mt-2 ${isMobile ? 'text-sm' : 'text-lg'} text-gray-500`}>Your cart is empty</p>
                </div>
              ) : (
                <>
                  {/* Simplified rendering for low-power devices */}
                  {isLowPower ? (
                    <div className="space-y-2">
                      {items.map((item) => {
                        const product = getProductDetails(item.productId);
                        if (!product) return null;
                        
                        return (
                          <div key={item.productId + item.size} className="flex items-center border-b pb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{product.name}</p>
                              <p className="text-xs text-gray-500">Size: {item.size}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => updateQuantity(item.productId, item.size, Math.max(1, item.quantity - 1))}
                                className="p-1 border rounded-md"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-sm w-6 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                                className="p-1 border rounded-md"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="text-sm font-semibold ml-4 w-16 text-right">
                              ₹{(product.price * item.quantity).toFixed(0)}
                            </div>
                            <button 
                              onClick={() => removeFromCart(item.productId, item.size)}
                              className="p-1 ml-2 text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item) => {
                        const product = getProductDetails(item.productId);
                        if (!product) return null;
                        
                        return (
                          <div key={item.productId + item.size} className="flex border rounded-lg overflow-hidden">
                            <div className="w-20 h-20 bg-gray-100 p-2 flex-shrink-0">
                              {product.images && product.images[0] && (
                                <img 
                                  src={product.images[0]} 
                                  alt={product.name} 
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                />
                              )}
                            </div>
                            <div className="flex-1 p-3">
                              <div className="flex justify-between">
                                <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-800`}>{product.name}</h3>
                                <button 
                                  onClick={() => removeFromCart(item.productId, item.size)}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-500">Size: {item.size}</p>
                              <div className="flex justify-between items-center mt-2">
                                <div className="flex items-center border rounded-md">
                                  <button 
                                    onClick={() => updateQuantity(item.productId, item.size, Math.max(1, item.quantity - 1))}
                                    className="px-2 py-1"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="px-2 text-sm">{item.quantity}</span>
                                  <button 
                                    onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                                    className="px-2 py-1"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <div className="text-base font-semibold">
                                  ₹{(product.price * item.quantity).toFixed(0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {showBillPrompt && !isLowPower && (
                    <div className="mt-4 mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">Item added to cart!</h3>
                      <p className="text-xs text-gray-600 mb-2">Would you like to view your order summary?</p>
                      <div className="flex justify-between items-center">
                        <button 
                          onClick={() => setShowBillPrompt(false)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Not now
                        </button>
                        <button 
                          onClick={() => setCurrentStep(1)}
                          className="text-xs bg-yellow-400 text-black px-3 py-1 rounded-md hover:bg-yellow-300"
                        >
                          View Summary
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 mb-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-700">Subtotal</p>
                      <p className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>₹{getTotalPrice().toFixed(0)}</p>
                    </div>
                    <button
                      onClick={clearCart}
                      className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Clear Cart
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {items.length > 0 && (
              <div className={`${isMobile ? 'p-3 sticky bottom-0 bg-white z-20' : 'p-4'} border-t`}>
                <button
                  onClick={() => setCurrentStep(1)}
                  className={buttonClasses}
                  style={{ touchAction: 'manipulation' }}
                >
                  View Order Summary <ArrowRight className={`ml-2 ${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Step 2: Bill Summary Modal */}
      {currentStep === 1 && (
        <div className={modalClasses} style={modalStyles}>
          <div className="flex flex-col h-full">
            <div className={`flex items-center justify-between ${isMobile ? 'p-3' : 'p-4'} border-b sticky top-0 z-10 bg-white`}>
              {isMobile ? (
                <>
                  <button onClick={() => setCurrentStep(0)} className="p-1">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>Order Summary</h2>
                  <div className="w-5"></div> {/* Empty div for flex spacing */}
                </>
              ) : (
                <>
                  <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>Order Summary</h2>
                  <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3' : 'p-4'}`}>
              {/* Bill component */}
              <Bill 
                selectedCoupon={selectedCoupon} 
                onSelectCoupon={setSelectedCoupon} 
                recommendedCoupons={recommendedCoupons} 
                isLowPower={isLowPower}
              />
            
              <div className={`${isMobile ? 'p-3 sticky bottom-0 bg-white z-20' : 'p-4'} border-t`}>
                <button
                  onClick={() => setCurrentStep(2)}
                  className={buttonClasses}
                  style={{ touchAction: 'manipulation' }}
                >
                  Proceed to Checkout <ArrowRight className={`ml-2 ${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
