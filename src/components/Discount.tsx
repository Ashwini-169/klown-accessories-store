import React, { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
import { Gift, Percent, DollarSign, Tag, ShoppingBag } from 'lucide-react';
import type { Coupon, CartItem, Product } from '../types';

interface DiscountProps {
  selectedCoupon: Coupon | null;
  totalPrice: number;
  onDiscountCalculated: (discount: number, freeProducts: CartItem[], savings?: {
    effectiveTotal: number;
    totalSavings: number;
    giftValue: number;
  }, breakdown?: string) => void;
}

/**
 * Helper function to apply Buy X Get Y discount logic
 */
function applyBuyXGetYDiscount({ 
  selectedCoupon, 
  cartItems, 
  products 
}: { 
  selectedCoupon: Coupon, 
  cartItems: CartItem[], 
  products: Product[] 
}) {
  let discount = 0;
  let breakdown = '';

  if (selectedCoupon.specialType === 'buyXgetY') {
    // Prefer coupon fields; fallback to title parsing
    let buyX = selectedCoupon.buyQuantity || 0;
    let getY = selectedCoupon.getQuantity || 0;

    // Parse "Buy X Get Y" from the title if fields missing or suspicious
    if ((!buyX || !getY) && selectedCoupon.title) {
      const match = selectedCoupon.title.match(/Buy\s*(\d+)\s*Get\s*(\d+)/i);
      if (match) {
        buyX = parseInt(match[2], 10);           // For "Buy 5 Get 7", buy 7
        getY = Math.abs(parseInt(match[2], 10) - parseInt(match[1], 10)); // Get 7-5 = 2
      }
    }
    
    // Enforce the marketing meaning: "Buy X Get Y" → buy Y, get (Y-X) free
    if (buyX && getY && getY > buyX) {
      const actualBuy = getY;                 // e.g., "Buy 5 Get 7" → buy 7
      const freeCount = getY - buyX;          // → get 2 free
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      if (totalQuantity >= actualBuy) {
        // Expand cart to item-level list for price-sorting
        const expandedItems: {productId: string, price: number}[] = [];
        cartItems.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            for (let i = 0; i < item.quantity; i++) {
              expandedItems.push({ productId: item.productId, price: product.price });
            }
          }
        });
        // Sort by price ascending, so we give the cheapest items for free
        expandedItems.sort((a, b) => a.price - b.price);
        // Discount the N cheapest items
        const discountItems = expandedItems.slice(0, freeCount);
        discount = discountItems.reduce((sum, item) => sum + item.price, 0);
        breakdown = `${selectedCoupon.title}: ${freeCount} item(s) free = ₹${discount} off`;
      } else {
        breakdown = `${selectedCoupon.title}: Add ${actualBuy - totalQuantity} more item(s) to qualify`;
      }
    } else {
      // Fallback: treat buyQuantity as minimum buy, getQuantity as free count
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      if (buyX && getY && totalQuantity >= buyX) {
        const expandedItems: {productId: string, price: number}[] = [];
        cartItems.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            for (let i = 0; i < item.quantity; i++) {
              expandedItems.push({ productId: item.productId, price: product.price });
            }
          }
        });
        expandedItems.sort((a, b) => a.price - b.price);
        const discountItems = expandedItems.slice(0, getY);
        discount = discountItems.reduce((sum, item) => sum + item.price, 0);
        breakdown = `${selectedCoupon.title}: ${getY} item(s) free = ₹${discount} off`;
      } else {
        breakdown = `${selectedCoupon.title}: Add ${buyX - totalQuantity} more item(s) to qualify`;
      }
    }
  }

  // Return discount value and breakdown
  return { discount, breakdown };
}

const Discount: React.FC<DiscountProps> = ({ 
  selectedCoupon, 
  totalPrice, 
  onDiscountCalculated 
}) => {
  const { cartItems } = useCart();
  const { products } = useProducts();
  const [calculatedDiscount, setCalculatedDiscount] = useState(0);
  const [freeProducts, setFreeProducts] = useState<CartItem[]>([]);
  const [discountBreakdown, setDiscountBreakdown] = useState<string>('');

  // Calculate the discount based on the selected coupon type
  useEffect(() => {
    if (!selectedCoupon || !cartItems || cartItems.length === 0) {
      setCalculatedDiscount(0);
      setFreeProducts([]);
      setDiscountBreakdown('');
      onDiscountCalculated(0, []);
      return;
    }
    
    console.log("Recalculating discount for coupon:", selectedCoupon.code);

    let discount = 0;
    let addedProducts: CartItem[] = [];
    let breakdown = '';

    switch (selectedCoupon.type) {
      case 'percentage':
        // Simple percentage discount with optional max cap
        discount = (totalPrice * selectedCoupon.discount) / 100;
        if (selectedCoupon.maxDiscount && discount > selectedCoupon.maxDiscount) {
          discount = selectedCoupon.maxDiscount;
          breakdown = `${selectedCoupon.discount}% discount (capped at ₹${selectedCoupon.maxDiscount})`;
        } else {
          breakdown = `${selectedCoupon.discount}% discount`;
        }
        break;

      case 'fixed':
        // Fixed amount discount
        discount = selectedCoupon.discount;
        breakdown = `₹${selectedCoupon.discount} flat discount`;
        break;

      case 'special':
        // Handle different special discount types
        if (selectedCoupon.specialType === 'buyXgetY') {
          // Use the separate helper function for Buy X Get Y logic
          const result = applyBuyXGetYDiscount({
            selectedCoupon,
            cartItems,
            products
          });
          
          discount = result.discount;
          breakdown = result.breakdown;
        } else if (selectedCoupon.specialType === 'bundle') {
          // Bundle discount - apply a percentage or fixed discount when certain quantity is reached
          const totalQuantity = cartItems.reduce((sum: number, item) => sum + item.quantity, 0);
          
          if (totalQuantity >= (selectedCoupon.minQuantity || 0)) {
            if (selectedCoupon.discount < 100) {
              // Percentage discount on entire cart
              discount = (totalPrice * selectedCoupon.discount) / 100;
              breakdown = `Bundle ${selectedCoupon.discount}% Off (${totalQuantity} items)`;
            } else {
              // Fixed discount
              discount = selectedCoupon.discount;
              breakdown = `Bundle ₹${selectedCoupon.discount} Off (${totalQuantity} items)`;
            }
          } else {
            // Not enough items to qualify
            breakdown = `Bundle discount (requires at least ${selectedCoupon.minQuantity || 0} items)`;
            discount = 0;
          }
        }
        break;

      case 'gift':
        // Gift coupon - adds a free product and also gives a discount
        if (selectedCoupon.discount > 0) {
          // For gifts, we assume a percentage discount if < 100, otherwise fixed
          if (selectedCoupon.discount < 100) {
            discount = (totalPrice * selectedCoupon.discount) / 100;
            breakdown = `${selectedCoupon.discount}% discount`;
          } else {
            discount = selectedCoupon.discount;
            breakdown = `₹${selectedCoupon.discount} flat discount`;
          }
        }
        
        // Add a free gift product if minimum purchase amount is met
        if (selectedCoupon.minAmount && totalPrice >= selectedCoupon.minAmount) {
          let giftProduct: CartItem;
          const giftValue = selectedCoupon.giftValue || 0;
          
          // Handle different gift types
          if (selectedCoupon.giftType === 'product' && selectedCoupon.giftProductId) {
            // Specific product gift
            const product = products.find(p => p.id === selectedCoupon.giftProductId);
            
            if (product) {
              giftProduct = {
                productId: product.id,
                name: product.name,
                price: 0, // It's free but has value
                quantity: 1,
                image: product.images && product.images.length > 0 ? product.images[0] : '',
                size: 'One Size',
                isFreeGift: true,
                giftValue: giftValue || product.price // Use actual product price as value
              };
              
              breakdown += breakdown ? 
                ` + Free ${product.name} (Value: ₹${giftProduct.giftValue})` : 
                `Free ${product.name} (Value: ₹${giftProduct.giftValue})`;
            } else {
              // Fallback to mystery gift if product not found
              giftProduct = {
                productId: 'GIFT-' + Date.now(),
                name: 'Mystery Gift',
                price: 0,
                quantity: 1,
                image: selectedCoupon.giftImage || '/gift-box.png',
                size: 'One Size',
                isFreeGift: true,
                giftValue: giftValue
              };
              
              const valueText = giftValue > 0 ? ` (Value: ₹${giftValue})` : '';
              breakdown += breakdown ? 
                ` + Free Mystery Gift${valueText}` : 
                `Free Mystery Gift${valueText}`;
            }
          } else {
            // Mystery or custom gift
            giftProduct = {
              productId: 'GIFT-' + Date.now(),
              name: selectedCoupon.giftDescription || 'Mystery Gift',
              price: 0,
              quantity: 1,
              image: selectedCoupon.giftImage || '/gift-box.png',
              size: 'One Size',
              isFreeGift: true
            };
            
            const giftName = selectedCoupon.giftDescription || 'Mystery Gift';
            breakdown += breakdown ? ` + Free ${giftName}` : `Free ${giftName}`;
          }
          
          addedProducts = [giftProduct];
        }
        break;
    }

    // Log information for debugging
    console.log(`Discount component calculation:
      - Coupon Type: ${selectedCoupon.type}
      - Special Type: ${selectedCoupon.specialType || 'none'}
      - Total Price: ${totalPrice}
      - Calculated Discount: ${discount}
      - Breakdown: ${breakdown}
      - Free Products: ${addedProducts.length}
    `);

    // Ensure discount is always a positive number and rounded to avoid floating point issues
    const finalDiscount = Math.max(0, Math.round(discount));
    
    // Calculate the effective total after discount
    const effectiveTotal = Math.max(0, totalPrice - finalDiscount);
    
    // Calculate the saved amount (discount + value of any free gifts)
    const giftValue = addedProducts.reduce((sum, item) => sum + (item.giftValue || 0), 0);
    const totalSavings = finalDiscount + giftValue;
    
    console.log(`Final values:
      - Original Total: ${totalPrice}
      - Discount Amount: ${finalDiscount}
      - Gift Value: ${giftValue}
      - Total Savings: ${totalSavings}
      - Effective Total: ${effectiveTotal}
    `);
    
    // Update state and notify parent
    setCalculatedDiscount(finalDiscount);
    setFreeProducts(addedProducts);
    setDiscountBreakdown(breakdown);
    
    // The important part: notify Bill component of calculated discount, savings info, and breakdown
    onDiscountCalculated(finalDiscount, addedProducts, {
      effectiveTotal,
      totalSavings,
      giftValue
    }, breakdown);
  }, [
    selectedCoupon?.id, 
    selectedCoupon?.type, 
    selectedCoupon?.discount, 
    selectedCoupon?.specialType,
    selectedCoupon?.buyQuantity,
    selectedCoupon?.getQuantity,
    selectedCoupon?.maxDiscount,
    // Using stable references for arrays to prevent unnecessary recalculation
    JSON.stringify(cartItems?.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    }))), 
    products?.length,
    totalPrice,
  ]);

  if (!selectedCoupon) {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {selectedCoupon.type === 'percentage' ? (
            <Percent className="h-4 w-4 text-blue-600 mr-2" />
          ) : selectedCoupon.type === 'fixed' ? (
            <DollarSign className="h-4 w-4 text-blue-600 mr-2" />
          ) : selectedCoupon.type === 'special' ? (
            <Tag className="h-4 w-4 text-blue-600 mr-2" />
          ) : (
            <Gift className="h-4 w-4 text-blue-600 mr-2" />
          )}
          <h3 className="text-sm font-medium text-blue-800">
            {selectedCoupon.title} ({selectedCoupon.code})
          </h3>
        </div>
        {calculatedDiscount > 0 && (
          <span className="text-sm font-bold text-blue-800">
            -₹{calculatedDiscount.toFixed(0)}
          </span>
        )}
      </div>
      
      <p className="text-xs text-blue-700 mb-1">{discountBreakdown}</p>
      
      {selectedCoupon.description && (
        <p className="text-xs text-blue-600 italic">{selectedCoupon.description}</p>
      )}
      
      {freeProducts.length > 0 && (
        <div className="mt-2 pt-2 border-t border-blue-200">
          <div className="flex items-center mb-1">
            <ShoppingBag className="h-3.5 w-3.5 text-blue-600 mr-1.5" />
            <span className="text-xs font-medium text-blue-700">
              Free Products Added:
            </span>
          </div>
          <ul className="text-xs text-blue-700 pl-5 list-disc">
            {freeProducts.map((item) => (
              <li key={item.productId}>
                {item.name || 'Mystery Gift Item'} (₹{item.giftValue || 0})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Discount;
