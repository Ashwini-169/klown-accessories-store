import React from 'react';

interface OrderSummaryProps {
  subtotal: number;
  discount: number;
  giftValue?: number;
  breakdown?: string;
  className?: string;
  onProceed?: () => void;
  proceedLabel?: string;
}

const fmt = (v: number) => Math.round(v).toFixed(0);

const OrderSummary: React.FC<OrderSummaryProps> = ({
  subtotal,
  discount,
  giftValue = 0,
  breakdown,
  className = '',
  onProceed,
  proceedLabel = 'Proceed to Checkout'
}) => {
  const safeDiscount = Math.max(0, Math.round(discount || 0));
  const safeSubtotal = Math.max(0, Math.round(subtotal || 0));
  const effectiveTotal = Math.max(0, safeSubtotal - safeDiscount);

  return (
    <div className={className}>
      <div className="mb-3 p-3 bg-gray-50 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-800">Order Summary</h4>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>₹{fmt(safeSubtotal)}</span>
          </div>

          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span className="font-medium">{safeDiscount > 0 ? `-₹${fmt(safeDiscount)}` : '₹0'}</span>
          </div>

          {giftValue > 0 && (
            <div className="flex justify-between text-purple-600">
              <span>Gift value</span>
              <span>₹{fmt(giftValue)}</span>
            </div>
          )}

          {breakdown && (
            <div className="text-xs text-blue-700 italic mt-1">
              {breakdown}
            </div>
          )}

          <div className="flex justify-between font-semibold text-base border-t pt-1.5 mt-1.5">
            <span>Total</span>
            <span>₹{fmt(effectiveTotal)}</span>
          </div>

          {safeDiscount > 0 && safeSubtotal > 0 && (
            <div className="text-xs text-green-600 text-right">
              You save {Math.round((safeDiscount / Math.max(1, safeSubtotal)) * 100)}%
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0">
        <button
          onClick={onProceed}
          className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black py-3 rounded-md font-medium hover:from-yellow-300 hover:to-orange-400 transition-all flex items-center justify-center shadow-md"
        >
          <span className="mr-2">{proceedLabel}</span>
          <span className="ml-2 bg-black bg-opacity-10 px-2 py-0.5 rounded text-sm">₹{fmt(effectiveTotal)}</span>
        </button>
      </div>
    </div>
  );
};

export default OrderSummary;
