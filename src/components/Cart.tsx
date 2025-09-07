import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag, Tag, Copy, Check, Gift, ArrowRight, ChevronLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
import Checkout from './Checkout';
import Bill from './Bill';
import OrderSummary from './OrderSummary.tsx';
import type { Coupon } from '../types';
import { getRecommendedCoupons } from '../utils/couponUtils';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose }) => {
  // Step management: 0 = Cart, 1 = Bill Summary, 2 = Checkout
  const [currentStep, setCurrentStep] = useState<number>(0);
  // coupons now sourced from ProductContext; no local fetch needed
  const [recommendedCoupons, setRecommendedCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showBillPrompt, setShowBillPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIsMobile();
    
    // Add listener for window resize
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  const { 
    items, 
    removeFromCart, 
    updateQuantity, 
    getTotalPrice, 
    clearCart, 
    getTotalItems,
    discount 
  } = useCart();
  const { products, coupons } = useProducts();
  
  // Listen for checkout event from Bill component
  useEffect(() => {
    const handleCheckout = () => setCurrentStep(2); // Set step to Checkout
    window.addEventListener('proceedToCheckout', handleCheckout);
    return () => window.removeEventListener('proceedToCheckout', handleCheckout);
  }, []);
  
  // Show bill prompt when items change
  useEffect(() => {
    if (items.length > 0) {
      setShowBillPrompt(true);
      // Auto-hide prompt after 5 seconds
      const timer = setTimeout(() => {
        setShowBillPrompt(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [items.length]);

  // Removed network fetch; coupons come from context (local JSON or server populated)

  // Update coupon recommendations whenever the cart changes
  useEffect(() => {
    if (coupons.length > 0 && items.length > 0) {
      const recommended = getRecommendedCoupons(
        items, 
        coupons,
        getTotalPrice(),
        getTotalItems()
      );
      // Sort by potential savings (most savings first)
      recommended.sort((a, b) => {
        const totalPrice = getTotalPrice();
        const savingsA = calculateSavings(a, totalPrice);
        const savingsB = calculateSavings(b, totalPrice);
        return savingsB - savingsA;
      });
      
      setRecommendedCoupons(recommended);
    } else {
      setRecommendedCoupons([]);
      setSelectedCoupon(null);
    }
  }, [coupons, items, getTotalPrice, getTotalItems]);
  
  // Helper function to calculate potential savings from a coupon
  const calculateSavings = (coupon: Coupon, subtotal: number): number => {
    if (coupon.type === 'percentage' && coupon.minAmount !== undefined && subtotal >= coupon.minAmount) {
      return Math.min((subtotal * coupon.discount) / 100, coupon.maxDiscount || Number.MAX_VALUE);
    } else if (coupon.type === 'fixed' && coupon.minAmount !== undefined && subtotal >= coupon.minAmount) {
      return Math.min(coupon.discount, coupon.maxDiscount || Number.MAX_VALUE);
    } else if (coupon.type === 'special' && coupon.specialType === 'buyXgetY') {
      // For special buy X get Y coupons, estimate based on lowest priced items
      // User only needs to meet the buyQuantity requirement
      if (items.length >= (coupon.buyQuantity || 0)) {
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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      })
      .catch(err => console.error('Failed to copy code:', err));
  };

  if (!isOpen) return null;

  const getProductDetails = (productId: string) => {
    return products.find(p => p.id === productId);
  };


  // Return appropriate component based on current step
  if (currentStep === 2) { // Checkout step
  // discount already managed in context/Bill, no need to compute here
  return <Checkout onClose={() => { setCurrentStep(0); onClose(); }} />;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Step 1: Cart Modal */}
      {currentStep === 0 && (
        <div className={`absolute ${isMobile ? 'inset-0' : 'right-0 top-0 h-full w-full max-w-md'} bg-white shadow-xl overflow-y-auto`}>
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
                  <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
                  <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <ShoppingBag className={`${isMobile ? 'h-12 w-12' : 'h-14 w-14'} text-gray-300 mb-3`} />
                <p className={`${isMobile ? 'text-base' : 'text-lg'} text-gray-600 mb-2`}>Your cart is empty</p>
                <p className="text-sm text-gray-500 text-center">Start shopping to add items to your cart</p>
                <button 
                  onClick={onClose} 
                  className="mt-4 px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-2' : 'p-3'}`}>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const product = getProductDetails(item.productId);
                      if (!product) return null;

                      return (
                        <div key={`${item.productId}-${item.size}`} className={`flex items-center space-x-2 md:space-x-3 ${item.isFreeGift ? 'bg-green-50 border border-green-200' : 'bg-gray-50'} ${isMobile ? 'p-2' : 'p-3'} rounded-lg`}>
                          <div className="relative">
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} object-cover rounded-md ${item.isFreeGift ? 'border-2 border-green-300' : ''}`}
                            />
                            {item.isFreeGift && (
                              <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                <Gift className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              {item.isFreeGift && (
                                <div className="flex items-center bg-green-100 text-green-700 text-xs px-1 py-0.5 rounded mr-1.5">
                                  <Gift className="h-2.5 w-2.5 mr-0.5" />
                                  <span>GIFT</span>
                                </div>
                              )}
                              <h4 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h4>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-gray-600">Size: {item.size}</p>
                              {item.isFreeGift ? (
                                <div className="flex items-center">
                                  <span className="text-green-600 font-bold text-sm mr-1">FREE</span>
                                  {item.giftValue && item.giftValue > 0 && (
                                    <span className="text-xs text-gray-500">(Value: ₹{item.giftValue})</span>
                                  )}
                                </div>
                              ) : (
                                <p className="font-bold text-gray-900 text-sm">₹{item.price}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              {!item.isFreeGift ? (
                                <div className="flex items-center border rounded-md bg-white">
                                  <button
                                    onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                                    className="px-1.5 py-0.5 hover:bg-gray-100 text-gray-500"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="font-medium text-xs px-2">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                                    className="px-1.5 py-0.5 hover:bg-gray-100 text-gray-500"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center text-xs text-green-600">
                                  <Gift className="h-3 w-3 mr-1" />
                                  <span>Gift Item</span>
                                </div>
                              )}
                              <button
                                onClick={() => removeFromCart(item.productId, item.size)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {showBillPrompt && (
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
                          onClick={() => {
                            setShowBillPrompt(false);
                            // Reset any previously selected coupon
                            setSelectedCoupon(null);
                            setCurrentStep(1); // Move to bill summary
                          }}
                          className="text-xs bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1.5 rounded-md"
                        >
                          View Summary
                        </button>
                      </div>
                    </div>
                  )}

                  {getTotalPrice() >= 1000 && (
                    <div className="mt-4 flex items-center justify-center bg-green-50 p-2 rounded-md text-xs text-green-700">
                      <Gift className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                      You qualify for a free mystery gift with your order!
                    </div>
                  )}

                  {/* Recommended Coupons (moved from Bill Summary modal to Cart) */}
                  {recommendedCoupons.length > 0 && (
                    <div className="mt-5 bg-gray-50 p-3 rounded-lg">
                      {/* Admin Coupons */}
                      {recommendedCoupons.some(c => c.id && typeof c.id === 'string' && c.id.startsWith('ADMIN')) && (
                        <div className="mb-3">
                          <div className="flex items-center mb-2">
                            <Tag className="h-4 w-4 text-purple-500 mr-2" />
                            <h3 className="text-sm font-semibold text-purple-700">Admin Special Offers</h3>
                          </div>
                          <ul className="space-y-2">
                            {recommendedCoupons
                              .filter(coupon => coupon.id && typeof coupon.id === 'string' && coupon.id.startsWith('ADMIN'))
                              .slice(0, 2)
                              .map((coupon) => {
                                const totalPrice = getTotalPrice();
                                const savings = calculateSavings(coupon, totalPrice);
                                return (
                                  <li key={coupon.id} className="text-xs sm:text-sm p-2 border border-dashed rounded border-purple-300 bg-purple-50">
                                    <div className="flex items-center mb-1">
                                      <span className="inline-block bg-purple-200 text-purple-800 text-[10px] px-1 py-0.5 rounded mr-1">EXCLUSIVE</span>
                                      <span className="font-medium">{coupon.code}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1">{coupon.description}</p>
                                    {savings > 0 && (
                                      <p className="text-xs text-purple-600 font-medium">Save ₹{savings.toFixed(0)}</p>
                                    )}
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}
                      {/* System Recommended Coupons */}
                      <div className="flex items-center mb-2">
                        <Tag className="h-4 w-4 text-yellow-500 mr-2" />
                        <h3 className="text-sm font-semibold text-gray-700">Recommended Offers</h3>
                      </div>
                      <ul className="space-y-2">
                        {recommendedCoupons
                          .filter(coupon => !(coupon.id && typeof coupon.id === 'string' && coupon.id.startsWith('ADMIN')))
                          .slice(0, 3)
                          .map((coupon) => {
                            const totalPrice = getTotalPrice();
                            const savings = calculateSavings(coupon, totalPrice);
                            const isBestDeal = recommendedCoupons.filter(c => !(c.id && typeof c.id === 'string' && c.id.startsWith('ADMIN')))[0]?.id === coupon.id;
                            return (
                              <li key={coupon.id} className={`text-xs sm:text-sm p-2 border border-dashed rounded ${isBestDeal ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
                                <div className="flex flex-wrap items-center justify-between">
                                  <div className="flex items-center mb-1 w-full">
                                    <span className="mr-1" role="img" aria-label="coupon icon">
                                      {coupon.type === 'percentage' ? '💰' : coupon.type === 'fixed' ? '💵' : coupon.type === 'special' ? '🎁' : '🎉'}
                                    </span>
                                    <div className="font-medium truncate max-w-[70%]">
                                      {coupon.code}
                                      {isBestDeal && <span className="ml-1 text-green-600">(Best)</span>}
                                    </div>
                                    <div className="flex ml-auto">
                                      <button onClick={() => setSelectedCoupon(coupon)} className="mr-1 px-2 py-0.5 bg-blue-500 hover:bg-blue-600 text-white rounded-sm text-xs">Apply</button>
                                      <button onClick={() => handleCopyCode(coupon.code)} className="px-2 py-0.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-sm text-xs flex items-center">
                                        {copiedCode === coupon.code ? (<><Check className="h-3 w-3 mr-1" />OK</>) : (<><Copy className="h-3 w-3 mr-1" />Copy</>)}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="w-full">
                                    <p className="text-xs text-gray-600 truncate">{coupon.description}</p>
                                    {savings > 0 && (<p className="text-xs text-green-600 font-medium">Save ₹{savings.toFixed(0)}</p>)}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                      {recommendedCoupons.length > 3 && (
                        <p className="text-xs text-gray-500 mt-2 text-center">+{recommendedCoupons.length - 3} more offers at checkout</p>
                      )}
                    </div>
                  )}

                    {/* Admin Recommended Coupons */}
                    {/*
                    {recommendedCoupons.some(coupon => coupon.adminRecommended) && (
                    <div className="mb-3">
                      <div className="flex items-center mb-2">
                      <Tag className="h-4 w-4 text-purple-500 mr-2" />
                      <h3 className="text-sm font-semibold text-purple-700">Admin Recommended Offers</h3>
                      </div>
                      <ul className="space-y-2">
                      {recommendedCoupons
                        .filter(coupon => coupon.adminRecommended)
                        .map((coupon) => {
                        const totalPrice = getTotalPrice();
                        const savings = calculateSavings(coupon, totalPrice);
                        return (
                          <li key={coupon.id} className="text-xs sm:text-sm p-2 border border-dashed rounded border-purple-300 bg-purple-50">
                          <div className="flex items-center mb-1">
                            <span className="inline-block bg-purple-200 text-purple-800 text-[10px] px-1 py-0.5 rounded mr-1">ADMIN</span>
                            <span className="font-medium">{coupon.code}</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{coupon.description}</p>
                          {savings > 0 && (
                            <p className="text-xs text-purple-600 font-medium">Save ₹{savings.toFixed(0)}</p>
                          )}
                          </li>
                        );
                        })}
                      </ul>
                    </div>
                    )}
                    */}

                  {/* Best Coupon for Consumer */}
                  {recommendedCoupons.length > 0 && (
                    <div className="mt-5 bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Tag className="h-4 w-4 text-yellow-500 mr-2" />
                        <h3 className="text-sm font-semibold text-gray-700">Best Offer for You</h3>
                      </div>
                      <ul className="space-y-2">
                        {recommendedCoupons
                          .filter(coupon => !(coupon.adminRecommended))
                          .slice(0, 1) // Only the best coupon
                          .map((coupon) => {
                            const totalPrice = getTotalPrice();
                            const savings = calculateSavings(coupon, totalPrice);
                            return (
                              <li key={coupon.id} className="text-xs sm:text-sm p-2 border border-dashed rounded border-green-300 bg-green-50">
                                <div className="flex flex-wrap items-center justify-between">
                                  <div className="flex items-center mb-1 w-full">
                                    <span className="mr-1" role="img" aria-label="coupon icon">
                                      {coupon.type === 'percentage' ? '💰' : coupon.type === 'fixed' ? '💵' : coupon.type === 'special' ? '🎁' : '🎉'}
                                    </span>
                                    <div className="font-medium truncate max-w-[70%]">
                                      {coupon.code}
                                      <span className="ml-1 text-green-600">(Best)</span>
                                    </div>
                                  </div>
                                  <div className="w-full">
                                    <p className="text-xs text-gray-600 truncate">{coupon.description}</p>
                                    {savings > 0 && (<p className="text-xs text-green-600 font-medium">Save ₹{savings.toFixed(0)}</p>)}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  )}
                </div>

                <div className={`${isMobile ? 'p-3' : 'p-4'} border-t ${isMobile ? 'sticky bottom-0 bg-white' : ''}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div>
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

                  <button
                    onClick={() => {
                      // When proceeding to the bill screen, reset any previously selected coupon
                      // to allow the user to apply a new one
                      setSelectedCoupon(null);
                      setCurrentStep(1);
                    }}
                    className={`w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black ${isMobile ? 'py-2.5 text-sm' : 'py-3'} rounded-md font-medium hover:from-yellow-300 hover:to-orange-400 transition-all flex items-center justify-center`}
                  >
                    View Order Summary <ArrowRight className={`ml-2 ${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
  {/* Step 2: Bill Summary Modal */}
      {currentStep === 1 && (
        <div className={`absolute ${isMobile ? 'inset-0' : 'right-0 top-0 h-full w-full max-w-md'} bg-white shadow-xl overflow-y-auto`}>
          <div className="flex flex-col h-full">
            <div className={`flex items-center justify-between ${isMobile ? 'p-3' : 'p-4'} border-b sticky top-0 z-10 bg-white`}>
              <div className="flex items-center">
                <button 
                  onClick={() => setCurrentStep(0)} 
                  className={`${isMobile ? 'mr-1 p-1' : 'mr-2 p-1.5'} ${isMobile ? '' : 'bg-gray-100 rounded-full hover:bg-gray-200'}`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>Order Summary</h2>
              </div>
              {!isMobile && (
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3' : 'p-4'}`}>
              {/* Bill component */}
              <Bill 
                selectedCoupon={selectedCoupon} 
                onSelectCoupon={setSelectedCoupon} 
                recommendedCoupons={recommendedCoupons} 
              />
            
              <div className={`${isMobile ? 'p-3 sticky bottom-0 bg-white' : 'p-4'} border-t`}>
                {/* Order Summary above checkout button */}
                <OrderSummary 
                  subtotal={getTotalPrice()}
                  discount={discount}
                  giftValue={selectedCoupon?.giftValue}
                  onProceed={() => setCurrentStep(2)}
                  className="mb-3"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
