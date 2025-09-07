import React, { useState, useEffect } from 'react';
import { X, MessageCircle, ChevronLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useProducts } from '../context/ProductContext';
import { useInventory } from '../services/InventoryService';

interface CheckoutProps {
  onClose: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ onClose }) => {
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if the device is mobile
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

  const { items, getTotalPrice, clearCart, discount } = useCart();
  const { products } = useProducts();
  const { processInventoryCheckout } = useInventory();

  const subtotal = getTotalPrice();
  // Now we get the discount directly from the CartContext
  const finalTotal = subtotal - discount;

  const handleInputChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const getProductDetails = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const generateWhatsAppMessage = () => {
    let message = `🛍️ *New Order from KLOWN Website*\n\n`;
    message += `👤 *Customer Details:*\n`;
    message += `• Name: ${customerInfo.name}\n`;
    message += `• Phone: ${customerInfo.phone}\n`;
    message += `• Address: ${customerInfo.address}\n\n`;
    
    message += `📦 *Order Details:*\n`;
    items.forEach(item => {
      const product = getProductDetails(item.productId);
      if (product) {
        message += `• ${product.name} (Size: ${item.size}) x${item.quantity} - ₹${item.price * item.quantity}\n`;
        message += `  Image: ${product.images[0]}\n`;
      }
    });
    
    message += `\n💰 *Payment Summary:*\n`;
    message += `• Subtotal: ₹${subtotal}\n`;
    
    // Enhanced discount information with coupon details
    if (discount > 0) {
      // Access applied coupon from context if available
      const appliedCoupon = window.localStorage.getItem('appliedCoupon');
      if (appliedCoupon) {
        try {
          const couponData = JSON.parse(appliedCoupon);
          const couponType = couponData.type || 'unknown';
          const couponCode = couponData.code || '';
          
          let discountTypeText = '';
          switch (couponType) {
            case 'percentage':
              discountTypeText = 'Percentage Discount';
              break;
            case 'fixed':
              discountTypeText = 'Fixed Amount Discount';
              break;
            case 'special':
              if (couponData.specialType === 'buyXgetY') {
                discountTypeText = `Buy ${couponData.buyQuantity} Get ${couponData.getQuantity} Discount`;
              } else {
                discountTypeText = 'Special Discount';
              }
              break;
            case 'gift':
              discountTypeText = 'Gift Discount';
              break;
            default:
              discountTypeText = 'Discount';
          }
          
          message += `• *Discount (${discountTypeText})*: -₹${discount}\n`;
          message += `• *Applied Coupon*: ${couponCode}\n`;
        } catch (e) {
          // If parsing fails, just show the basic discount
          message += `• Discount: -₹${discount}\n`;
        }
      } else {
        // Fallback if no coupon data is available
        message += `• Discount: -₹${discount}\n`;
      }
    }
    
    message += `• *Total Amount: ₹${finalTotal}*\n\n`;
    
    message += `📱 *Customer Request:*\n`;
    message += `Please confirm availability and provide delivery/pickup details.\n\n`;
    message += `Thank you! 🙏`;
    
    return encodeURIComponent(message);
  };

  const processOrder = async () => {
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      alert('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    
    // Generate WhatsApp message and open WhatsApp
    const whatsappMessage = generateWhatsAppMessage();
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=7858843043&text=${whatsappMessage}&type=phone_number&app_absent=0`;
    
    window.open(whatsappUrl, '_blank');

    // Process inventory checkout and generate order ID
    const orderId = `WA-${Date.now().toString().slice(-8)}`;
    
    // Process inventory checkout which will:
    // 1. Decrease stock for each item via ProductContext
    // 2. Record transactions in InventoryService
    processInventoryCheckout(customerInfo, orderId);
    
    // Simulate order processing with a slight delay
    setTimeout(() => {
      setIsProcessing(false);
      setOrderComplete(true);
      
      setTimeout(() => {
        // Clear the applied coupon data when order is complete
        localStorage.removeItem('appliedCoupon');
        clearCart();
        onClose();
        setOrderComplete(false);
      }, 3000);
    }, 2000);
  };

  if (orderComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-8 rounded-2xl max-w-md mx-4 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Order Successful!</h2>
          <p className="text-gray-600">Thank you for your purchase. You'll receive a confirmation shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={`absolute ${isMobile ? 'inset-0' : 'right-0 top-0 h-full w-full max-w-lg'} bg-white shadow-xl overflow-y-auto`}>
        <div className={`${isMobile ? 'sticky top-0 z-10 bg-white' : ''} p-4 md:p-6 border-b`}>
          <div className="flex items-center justify-between">
            {isMobile ? (
              <>
                <button onClick={onClose} className="p-1">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">Checkout</h2>
                <div className="w-6"></div> {/* Empty div for flex spacing */}
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className={`p-4 ${isMobile ? 'pt-2' : 'p-6'}`}>
          <div className="mb-4 md:mb-6">
            <h3 className="text-lg font-semibold mb-3 md:mb-4">Customer Information</h3>
            <div className="space-y-3 md:space-y-4">
              <input
                type="text"
                placeholder="Full Name *"
                value={customerInfo.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />

              <input
                type="tel"
                placeholder="Phone Number *"
                value={customerInfo.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
              <textarea
                placeholder="Delivery Address *"
                rows={isMobile ? 2 : 3}
                value={customerInfo.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Coupon section removed - now handled in Bill.tsx */}

          <div className="mb-4 md:mb-6 bg-gray-50 p-3 md:p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="border-t pt-2 font-bold flex justify-between">
                <span>Total:</span>
                <span>₹{finalTotal}</span>
              </div>
            </div>
          </div>

          <div className="mb-4 md:mb-6 bg-blue-50 p-3 md:p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-1 md:mb-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">WhatsApp Order</h3>
            </div>
            <p className="text-sm text-blue-700">
              Your order will be sent via WhatsApp for quick confirmation and delivery coordination.
            </p>
          </div>

          <button
            onClick={processOrder}
            disabled={isProcessing}
            className={`w-full ${isMobile ? 'py-3 text-base' : 'py-4 text-lg'} rounded-lg font-semibold transition-all ${
              isProcessing
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-400 hover:to-green-500 transform hover:scale-105 flex items-center justify-center space-x-2'
            }`}
          >
            {isProcessing ? (
              'Sending Order...'
            ) : (
              <>
                <MessageCircle className="h-5 w-5" />
                <span>Send Order via WhatsApp - ₹{finalTotal}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;