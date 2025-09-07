import React, { useState, useEffect } from 'react';
import { Receipt, Tag, Info, Clock, AlertCircle, Copy, Check, Gift } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
import type { Coupon, Product } from '../types';
import Discount from './Discount';

// Define props interface
interface BillProps {
  selectedCoupon: Coupon | null;
  onSelectCoupon: (coupon: Coupon | null) => void;
  recommendedCoupons: Coupon[];
}

// Bill component definition
const Bill: React.FC<BillProps> = ({ 
  selectedCoupon, 
  onSelectCoupon, 
  recommendedCoupons 
}) => {
  // Get cart functions from context
  const { items, getTotalPrice, setDiscount: setContextDiscount, addFreeItem } = useCart();
  const { products, validateCoupon, coupons: contextCoupons } = useProducts();
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [discountBreakdown, setDiscountBreakdown] = useState<string>('');
  const [bestCoupon, setBestCoupon] = useState<Coupon | null>(null);
  const [orderId, setOrderId] = useState<string>("");
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponMessage, setCouponMessage] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [suggestedCartAddition, setSuggestedCartAddition] = useState<{ amount: number; coupon: Coupon | null }>({
    amount: 0,
    coupon: null
  });
  const [showAllCoupons, setShowAllCoupons] = useState<boolean>(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [couponSortBy, setCouponSortBy] = useState<'discount' | 'expiry'>('discount');

  // Generate a random order ID
  useEffect(() => {
    const randomId = Math.floor(100000 + Math.random() * 900000).toString();
    setOrderId(`ORD-${randomId}`);
  }, []);

  // Derive available coupons from ProductContext (fallback to local JSON) instead of network fetch
  useEffect(() => {
    // Filter out visible coupons
    const visibleCoupons = (contextCoupons || [])
      .filter(c => c.active && (c.isVisible !== false));
    
    // De-duplicate coupons with the same ID to prevent React key issues
    const uniqueCoupons = visibleCoupons.reduce<Coupon[]>((acc, current) => {
      const isDuplicate = acc.find(item => item.id === current.id);
      if (!isDuplicate) {
        return [...acc, current];
      }
      return acc;
    }, []);
    
    setAvailableCoupons(uniqueCoupons);
  }, [contextCoupons]);

  // Handle copying coupon code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      })
      .catch(err => console.error('Failed to copy code:', err));
  };

  // Handle applying coupon from input
  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponMessage('Please enter a coupon code');
      return;
    }

    const result = validateCoupon(couponCode, subtotal);
    setCouponMessage(result.message);
    
    if (result.valid) {
      // Find the coupon in the recommended list
      const foundCoupon = recommendedCoupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase());
      if (foundCoupon) {
        onSelectCoupon(foundCoupon);
        setCouponCode('');
      } else {
        // If not in recommended list, create a basic coupon object
        const basicCoupon: Coupon = {
          id: couponCode,
          code: couponCode,
          title: 'Applied Coupon',
          description: 'Custom coupon applied',
          discount: result.discount,
          type: result.discount > subtotal * 0.1 ? 'percentage' : 'fixed',
          maxDiscount: result.discount,
          validUntil: new Date().toISOString(),
          active: true,
          usageLimit: 1,
          usedCount: 0
        };
        onSelectCoupon(basicCoupon);
        setCouponCode('');
      }
    }
  };

  // This callback will be triggered by the Discount component
  const handleDiscountCalculated = (
    calculatedDiscount: number, 
    freeProducts: any[], 
    savings?: { giftValue: number }, 
    breakdown?: string
  ) => {
    console.log("Bill.tsx received from Discount.tsx:", { calculatedDiscount, freeProducts, savings, breakdown });
    const currentSubtotal = getTotalPrice();
    const finalDiscount = Math.round(calculatedDiscount);

    setDiscount(finalDiscount);
    setContextDiscount(finalDiscount); // Update context for other components
    setDiscountBreakdown(breakdown || '');
    setTotal(currentSubtotal - finalDiscount);

    // Store the selected coupon information for the WhatsApp message
    if (selectedCoupon) {
      try {
        // Save minimal coupon data to avoid bloating localStorage
        const couponForStorage = {
          id: selectedCoupon.id,
          code: selectedCoupon.code,
          type: selectedCoupon.type,
          specialType: selectedCoupon.specialType,
          buyQuantity: selectedCoupon.buyQuantity,
          getQuantity: selectedCoupon.getQuantity,
          discount: selectedCoupon.discount,
          title: selectedCoupon.title
        };
        localStorage.setItem('appliedCoupon', JSON.stringify(couponForStorage));
      } catch (e) {
        console.error('Error storing coupon data:', e);
      }
    } else {
      // Clear stored coupon when no coupon is selected
      localStorage.removeItem('appliedCoupon');
    }

    // Handle adding free items to the cart
    if (freeProducts.length > 0) {
      freeProducts.forEach(item => {
        addFreeItem(item);
      });
    }
  };

  // Calculate subtotal, and reset discount when coupon is removed
  useEffect(() => {
    const currentSubtotal = getTotalPrice();
    setSubtotal(currentSubtotal);

    if (!selectedCoupon) {
      // Reset all discount-related values when no coupon is selected
      setDiscount(0);
      setContextDiscount(0);
      setDiscountBreakdown('');
      setTotal(currentSubtotal);
    }
    // The actual discount calculation is now handled by the Discount component
    // and the handleDiscountCalculated callback.
  }, [items, getTotalPrice, selectedCoupon, setContextDiscount]);

  // Handle applying the best coupon
  const handleApplyBestCoupon = () => {
    if (bestCoupon && (!selectedCoupon || bestCoupon.id !== selectedCoupon.id)) {
      onSelectCoupon(bestCoupon);
    }
  };

  // Handle removing the coupon
  const handleRemoveCoupon = () => {
    onSelectCoupon(null);
  };

  // Find the product name
  const getProductName = (productId: string) => {
    const product = products.find((p: Product) => p.id === productId);
    return product ? product.name : 'Product';
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Order Info Header */}
      <div className="bg-gray-50 p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Receipt className="h-4 w-4 mr-2 text-gray-700" />
            <h2 className="font-semibold text-gray-800">Order Summary</h2>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            <span>{orderId}</span>
          </div>
        </div>
      </div>
      
      {/* Items Table */}
      <div className="p-2 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-2 py-1 text-left">Item</th>
              <th className="px-2 py-1 text-center">Qty</th>
              <th className="px-2 py-1 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.productId}-${item.size}-${index}`} className="border-b border-gray-100">
                <td className="px-2 py-1.5">
                  <div className="truncate max-w-[120px]">
                    {getProductName(item.productId)}
                    <span className="text-xs text-gray-500 ml-1">({item.size})</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-center">{item.quantity}</td>
                <td className="px-2 py-1.5 text-right">₹{(item.price * item.quantity).toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Totals */}
      <div className="p-3 border-t bg-gray-50">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>₹{subtotal.toFixed(0)}</span>
          </div>
          
          {/* The Discount component will now render the discount details */}
          {selectedCoupon && (
            <Discount
              selectedCoupon={selectedCoupon}
              totalPrice={subtotal}
              onDiscountCalculated={handleDiscountCalculated}
            />
          )}
          
          {/* Display mystery gift value if any */}
          {selectedCoupon && selectedCoupon.type === 'gift' && selectedCoupon.giftValue && selectedCoupon.giftValue > 0 && (
            <div className="flex justify-between text-purple-600">
              <span>Mystery Gift Value</span>
              <span>₹{selectedCoupon.giftValue.toFixed(0)}</span>
            </div>
          )}
          
          <div className="flex justify-between font-semibold text-base border-t pt-1.5 mt-1.5">
            <span>Total</span>
            <span>₹{total.toFixed(0)}</span>
          </div>
          
          {/* Display the effective discount percentage */}
          {discount > 0 && subtotal > 0 && (
            <div className="text-xs text-green-600 text-right mt-1">
              You save {Math.round((discount / subtotal) * 100)}%
            </div>
          )}
        </div>
      </div>
      
      {/* Coupon Input Section */}
      <div className="p-3 border-t border-gray-100">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="couponCode" className="block text-xs font-medium text-gray-700">Apply Coupon</label>
            <button 
              onClick={() => setShowAllCoupons(!showAllCoupons)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              {showAllCoupons ? 'Hide Coupon List' : 'View All Coupons'}
            </button>
          </div>
          <div className="flex space-x-2">
            <input
              id="couponCode"
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="flex-1 border border-gray-300 rounded-md text-sm px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
            <button
              onClick={handleApplyCoupon}
              className="bg-yellow-500 text-white rounded-md px-4 text-sm font-medium hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              Apply
            </button>
          </div>
          {couponMessage && (
            <p className={`text-xs mt-1 ${couponMessage.includes('Invalid') || couponMessage.includes('expired') ? 'text-red-600' : 'text-green-600'}`}>
              {couponMessage}
            </p>
          )}
        </div>
        
        {/* Available Coupons List */}
        {showAllCoupons && (
          <div className="mb-4 bg-gray-50 p-2 rounded-md border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Available Coupons</h3>
              <div className="flex text-xs">
                <button 
                  onClick={() => setCouponSortBy('discount')}
                  className={`px-2 py-0.5 rounded-l ${couponSortBy === 'discount' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}
                >
                  Best Value
                </button>
                <button 
                  onClick={() => setCouponSortBy('expiry')}
                  className={`px-2 py-0.5 rounded-r ${couponSortBy === 'expiry' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}
                >
                  Expiring Soon
                </button>
              </div>
            </div>
            {availableCoupons.length === 0 && (
              <p className="text-xs text-gray-500 p-2">No visible coupons available. (Start server to load API coupons or add more in coupons.json)</p>
            )}
            <div className="max-h-40 overflow-y-auto pr-1">
              <ul className="space-y-1.5">
                {availableCoupons
                  .sort((a, b) => {
                    if (couponSortBy === 'discount') {
                      // Sort by discount value (percentage and amount)
                      const valueA = a.type === 'percentage' ? (subtotal * a.discount / 100) : a.discount;
                      const valueB = b.type === 'percentage' ? (subtotal * b.discount / 100) : b.discount;
                      return valueB - valueA;
                    } else {
                      // Sort by expiry date
                      return new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
                    }
                  })
                  .map((coupon, index) => {
                    const isAdmin = coupon.id && typeof coupon.id === 'string' && coupon.id.startsWith('ADMIN');
                    const isApplicable = 
                      (coupon.minAmount === undefined || subtotal >= coupon.minAmount) &&
                      (coupon.minQuantity === undefined || items.length >= coupon.minQuantity);
                    
                    const couponValue = coupon.type === 'percentage' 
                      ? `${coupon.discount}% off`
                      : coupon.type === 'fixed' 
                        ? `₹${coupon.discount} off` 
                        : coupon.type === 'special' && coupon.specialType === 'buyXgetY'
                          ? `Buy ${coupon.buyQuantity} Get ${coupon.getQuantity} Free`
                          : '';
                          
                    return (
                      <li 
                        key={`${coupon.id}-${index}`} 
                        className={`p-1.5 text-xs border rounded-md ${
                          isAdmin 
                            ? 'border-purple-200 bg-purple-50' 
                            : isApplicable 
                              ? 'border-green-200 bg-green-50' 
                              : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center">
                              <span className="font-medium text-gray-800">{coupon.code}</span>
                              {isAdmin && (
                                <span className="ml-1 bg-purple-100 text-purple-700 px-1 rounded text-[10px]">ADMIN</span>
                              )}
                              {!isApplicable && (
                                <span className="ml-1 text-red-500 text-[10px]">Not applicable</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 truncate max-w-[180px]">{coupon.description}</p>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className="font-medium text-green-600">{couponValue}</span>
                              {coupon.minAmount && (
                                <span className="text-[10px] text-gray-500">Min. ₹{coupon.minAmount}</span>
                              )}
                              <span className="text-[10px] text-gray-500">Exp: {new Date(coupon.validUntil).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleCopyCode(coupon.code)}
                              className="p-1 bg-gray-100 hover:bg-gray-200 rounded"
                              title="Copy code"
                            >
                              {copiedCode === coupon.code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                            {isApplicable && (
                              <button
                                onClick={() => onSelectCoupon(coupon)}
                                className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
                                title="Apply coupon"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        )}

        {/* Applied Coupon */}
        {selectedCoupon && (
          <>
            <div className="bg-yellow-50 p-2 rounded-md border border-yellow-200 text-xs mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Tag className="h-3.5 w-3.5 text-yellow-600 mr-1.5" />
                  <span className="font-medium">Applied: {selectedCoupon.code}</span>
                  {selectedCoupon.id && typeof selectedCoupon.id === 'string' && selectedCoupon.id.startsWith('ADMIN') && (
                    <span className="ml-1 bg-purple-100 text-purple-700 px-1 rounded text-[10px]">ADMIN</span>
                  )}
                </div>
                <button 
                  onClick={handleRemoveCoupon}
                  className="text-xs text-red-500 hover:text-red-700 px-1"
                >
                  Remove
                </button>
              </div>
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-600 line-clamp-1">{selectedCoupon.description}</p>
                <p className="text-xs text-green-600 font-medium whitespace-nowrap ml-1">
                  Saved ₹{discount.toFixed(0)}
                  {selectedCoupon.type === 'gift' && selectedCoupon.giftValue ? 
                    ` + ₹${selectedCoupon.giftValue.toFixed(0)} gift` : ''}
                </p>
              </div>
            </div>
            
            {/* Discount Component */}
            <div className="mb-2">
              <Discount 
                selectedCoupon={selectedCoupon} 
                totalPrice={subtotal} 
                onDiscountCalculated={(calculatedDiscount, freeProducts, savingsInfo, breakdown) => {
                  console.log(`Discount calculated: ${calculatedDiscount}, Subtotal: ${subtotal}`);
                  
                  // Always use a rounded integer value for stability
                  const roundedDiscount = Math.max(0, Math.round(calculatedDiscount));
                  
                  // Always update the discount - important for special cases like "Buy X Get Y"
                  // Update the discount amount
                  setDiscount(roundedDiscount);
                  setContextDiscount(roundedDiscount);
                  
                  // Store the discount breakdown for display
                  if (breakdown) {
                    setDiscountBreakdown(breakdown);
                  }
                  
                  // Use the provided effectiveTotal if available, otherwise calculate it
                  let newTotal;
                  if (savingsInfo?.effectiveTotal !== undefined) {
                    newTotal = savingsInfo.effectiveTotal;
                  } else {
                    newTotal = Math.max(0, subtotal - roundedDiscount);
                  }
                  console.log(`Setting new total: ${newTotal}`);
                  setTotal(newTotal);
                  
                  // Add any free items to the cart
                  if (freeProducts && freeProducts.length > 0) {
                    freeProducts.forEach(item => {
                      // Avoid adding duplicate free items
                      if (addFreeItem) {
                        addFreeItem(item);
                      }
                    });
                  }
                  
                  // Update the saved amount text to reflect total savings (discount + gift value)
                  if (savingsInfo?.totalSavings !== undefined) {
                    console.log(`Total savings: ${savingsInfo.totalSavings} (Discount: ${roundedDiscount}, Gift value: ${savingsInfo.giftValue || 0})`);
                  }
                }} 
              />
            </div>
          </>
        )}

        {/* Best Coupon Suggestion */}
        {!selectedCoupon && bestCoupon && (
          <div className="bg-blue-50 p-2 rounded-md border border-blue-200 text-xs mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Info className="h-3.5 w-3.5 text-blue-600 mr-1.5" />
                <span className="font-medium">Best Deal: {bestCoupon.code}</span>
                {bestCoupon.id && typeof bestCoupon.id === 'string' && bestCoupon.id.startsWith('ADMIN') && (
                  <span className="ml-1 bg-purple-100 text-purple-700 px-1 rounded text-[10px]">ADMIN</span>
                )}
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => handleCopyCode(bestCoupon.code)}
                  className="mr-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 flex items-center"
                >
                  {copiedCode === bestCoupon.code ? (
                    <><Check className="h-3 w-3 mr-0.5" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3 mr-0.5" /> Copy</>
                  )}
                </button>
                <button 
                  onClick={handleApplyBestCoupon}
                  className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  Apply
                </button>
              </div>
            </div>
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-600 line-clamp-1">{bestCoupon.description}</p>
              <p className="text-xs text-green-600 font-medium whitespace-nowrap ml-1">Save ₹{(Math.min(
                bestCoupon.type === 'percentage' ? (subtotal * bestCoupon.discount) / 100 : bestCoupon.discount,
                bestCoupon.maxDiscount || Number.MAX_VALUE
              )).toFixed(0)}</p>
            </div>
          </div>
        )}

        {/* Cart Upgrade Suggestion */}
        {suggestedCartAddition.amount > 0 && suggestedCartAddition.coupon && (
          <div className="bg-green-50 p-2 rounded-md border border-green-200 text-xs mb-3">
            <div className="flex items-center">
              <Gift className="h-3.5 w-3.5 text-green-600 mr-1.5" />
              <span className="font-medium">Shopping Tip</span>
            </div>
            <p className="text-xs text-gray-700 mt-1">
              Add ₹{suggestedCartAddition.amount.toFixed(0)} more to your cart to qualify for <span className="font-semibold">{suggestedCartAddition.coupon.code}</span> and save up to ₹{Math.min(
                suggestedCartAddition.coupon.type === 'percentage' 
                  ? ((subtotal + suggestedCartAddition.amount) * suggestedCartAddition.coupon.discount) / 100 
                  : suggestedCartAddition.coupon.discount,
                suggestedCartAddition.coupon.maxDiscount || Number.MAX_VALUE
              ).toFixed(0)}!
            </p>
          </div>
        )}

        {/* Admin Disclaimer Box */}
  {recommendedCoupons.some((coupon: Coupon) => coupon.id && typeof coupon.id === 'string' && coupon.id.startsWith('ADMIN')) && (
          <div className="bg-purple-50 p-2 rounded-md border border-purple-200 text-xs mb-3">
            <div className="flex items-center">
              <AlertCircle className="h-3.5 w-3.5 text-purple-600 mr-1.5" />
              <span className="font-medium">Admin Message</span>
            </div>
            <p className="text-xs text-gray-700 mt-1">
              Special coupon codes marked as ADMIN are exclusive offers created for you. These coupons may have higher discounts than our regular promotions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Export the component
export default Bill;
